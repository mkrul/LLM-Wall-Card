import AVFoundation
import Cocoa
import Darwin
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate, AVAudioPlayerDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var projectRoot: URL!
    private var tipOpen = false
    private var restContentWidth: CGFloat = 400
    private let cardWidth: CGFloat = 400
    private let tipExtra: CGFloat = 336
    private var watchSource: DispatchSourceFileSystemObject?
    private var watchFD: Int32 = -1
    private var reloadWork: DispatchWorkItem?
    private var speechPlayer: AVAudioPlayer?
    private var speechTask: Process?
    private var speechGeneration = 0
    private var speechURL = ""

    func applicationDidFinishLaunching(_ notification: Notification) {
        let bundle = URL(fileURLWithPath: Bundle.main.bundlePath).resolvingSymlinksInPath()
        projectRoot = bundle.deletingLastPathComponent()
        let index = projectRoot.appendingPathComponent("index.html")
        let background = NSColor(srgbRed: 13 / 255, green: 13 / 255, blue: 13 / 255, alpha: 1)

        let controller = WKUserContentController()
        controller.add(self, name: "card")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 400, height: 560), configuration: config)
        webView.underPageBackgroundColor = background
        webView.allowsMagnification = false
        webView.navigationDelegate = self
        self.webView = webView

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 560),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "LLM Wall Card"
        window.contentView = webView
        window.minSize = NSSize(width: 400, height: 480)
        window.delegate = self
        window.isReleasedWhenClosed = false
        window.tabbingMode = .disallowed
        window.appearance = NSAppearance(named: .darkAqua)
        window.backgroundColor = background
        self.window = window

        placeOnTallestScreen()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        if FileManager.default.fileExists(atPath: index.path) {
            webView.loadFileURL(index, allowingReadAccessTo: projectRoot)
        } else {
            let alert = NSAlert()
            alert.messageText = "Could not find the card"
            alert.informativeText = "index.html should sit next to LLM Wall Card.app."
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        watchDataDirectory()
        catchUp()
    }

    private func tallestScreen() -> NSScreen? {
        NSScreen.screens.max(by: { $0.visibleFrame.height < $1.visibleFrame.height }) ?? window.screen
    }

    private func placeOnTallestScreen() {
        guard let screen = tallestScreen() else { return }
        let visible = screen.visibleFrame
        let fitted = window.frameRect(forContentRect: NSRect(x: 0, y: 0, width: cardWidth, height: min(560, visible.height)))
        let frame = NSRect(
            x: visible.minX,
            y: visible.maxY - fitted.height,
            width: fitted.width,
            height: fitted.height
        )
        window.setFrame(frame, display: true)
    }

    private func fitContent(_ contentHeight: CGFloat) {
        guard contentHeight > 200, let screen = tallestScreen() else { return }
        let visible = screen.visibleFrame
        let height = min(contentHeight, visible.height)
        let content = NSRect(x: 0, y: 0, width: tipOpen ? window.contentRect(forFrameRect: window.frame).width : cardWidth, height: height)
        var frame = window.frameRect(forContentRect: content)
        if frame.height > visible.height {
            frame.size.height = visible.height
        }
        frame.origin.x = tipOpen ? window.frame.minX : visible.minX
        frame.origin.y = visible.maxY - frame.height
        window.setFrame(frame, display: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        window.makeKeyAndOrderFront(nil)
        return true
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        if tipOpen {
            setTipOpen(false)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "card", let body = message.body as? [String: Any] else {
            return
        }
        DispatchQueue.main.async {
            if let fit = body["fit"] as? NSNumber {
                self.fitContent(CGFloat(fit.doubleValue))
            }
            if body["open"] != nil {
                self.setTipOpen((body["open"] as? Bool) ?? false)
            }
            if let urlString = body["url"] as? String, let url = URL(string: urlString),
               let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" {
                NSWorkspace.shared.open(url)
            }
            if let speak = body["speak"] as? [String: Any], let url = speak["url"] as? String {
                self.toggleSpeech(
                    url: url,
                    title: speak["title"] as? String ?? "",
                    detail: speak["detail"] as? String ?? ""
                )
            }
        }
    }

    private func watchDataDirectory() {
        let dir = projectRoot.appendingPathComponent("data")
        watchFD = open(dir.path, O_EVTONLY)
        guard watchFD >= 0 else { return }
        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: watchFD,
            eventMask: .write,
            queue: .main
        )
        source.setEventHandler { [weak self] in
            self?.scheduleReload()
        }
        source.setCancelHandler { [weak self] in
            if let fd = self?.watchFD, fd >= 0 {
                close(fd)
                self?.watchFD = -1
            }
        }
        source.resume()
        watchSource = source
    }

    private func scheduleReload() {
        reloadWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.webView.reload()
        }
        reloadWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6, execute: work)
    }

    private func setTipOpen(_ open: Bool) {
        var content = window.contentRect(forFrameRect: window.frame)
        if open && !tipOpen {
            restContentWidth = content.size.width
            if let screen = window.screen?.visibleFrame ?? NSScreen.main?.visibleFrame {
                let overflow = content.maxX + tipExtra - screen.maxX
                if overflow > 0 {
                    content.origin.x -= overflow
                }
            }
            content.size.width = max(restContentWidth, cardWidth + tipExtra)
            window.setFrame(window.frameRect(forContentRect: content), display: true)
            tipOpen = true
        } else if !open && tipOpen {
            content.size.width = restContentWidth
            window.setFrame(window.frameRect(forContentRect: content), display: true)
            tipOpen = false
        }
    }

    private func toggleSpeech(url: String, title: String, detail: String) {
        if speechURL == url && (speechPlayer?.isPlaying == true || speechTask != nil) {
            stopSpeech()
            return
        }
        stopSpeech()
        speechURL = url
        speechGeneration += 1
        let generation = speechGeneration
        reportSpeech(url: url, state: "loading", message: "")
        let root = projectRoot!
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let result = self?.renderSpeech(root: root, url: url, title: title, detail: detail, generation: generation)
            DispatchQueue.main.async {
                guard let self = self, generation == self.speechGeneration else { return }
                self.speechTask = nil
                switch result {
                case .file(let path):
                    self.playSpeech(path: path, url: url)
                case .message(let message):
                    self.speechURL = ""
                    if !message.isEmpty {
                        self.reportSpeech(url: url, state: "idle", message: message)
                    }
                case .none:
                    break
                }
            }
        }
    }

    private enum SpeechResult {
        case file(String)
        case message(String)
    }

    private func renderSpeech(root: URL, url: String, title: String, detail: String, generation: Int) -> SpeechResult {
        let script = root.appendingPathComponent("scripts/speak.py")
        guard FileManager.default.fileExists(atPath: script.path) else {
            return .message("Could not find the speech script.")
        }
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        task.arguments = [script.path]
        task.currentDirectoryURL = root
        let input = Pipe()
        let output = Pipe()
        let errors = Pipe()
        task.standardInput = input
        task.standardOutput = output
        task.standardError = errors
        if generation != speechGeneration {
            return .message("")
        }
        speechTask = task
        do {
            try task.run()
        } catch {
            return .message("Could not start audio.")
        }
        let payload: [String: String] = ["url": url, "title": title, "detail": detail]
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            input.fileHandleForWriting.write(data)
        }
        try? input.fileHandleForWriting.close()
        task.waitUntilExit()
        let path = String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if task.terminationStatus == 0, path.hasPrefix("/"), FileManager.default.fileExists(atPath: path) {
            return .file(path)
        }
        if task.terminationReason == .uncaughtSignal {
            return .message("")
        }
        let message = String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return .message(message.isEmpty ? "Could not play that article." : message)
    }

    private func playSpeech(path: String, url: String) {
        do {
            let player = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: path))
            player.delegate = self
            speechPlayer = player
            player.play()
            reportSpeech(url: url, state: "playing", message: "")
        } catch {
            speechURL = ""
            reportSpeech(url: url, state: "idle", message: "Could not play that article.")
        }
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard player === speechPlayer else { return }
        let url = speechURL
        speechPlayer = nil
        speechURL = ""
        reportSpeech(url: url, state: "idle", message: "")
    }

    private func stopSpeech() {
        speechGeneration += 1
        speechTask?.terminate()
        speechTask = nil
        speechPlayer?.stop()
        speechPlayer = nil
        let url = speechURL
        speechURL = ""
        if !url.isEmpty {
            reportSpeech(url: url, state: "idle", message: "")
        }
    }

    private func reportSpeech(url: String, state: String, message: String) {
        let js = "window.setSpeechState(\(jsString(url)), \(jsString(state)), \(jsString(message)))"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func jsString(_ value: String) -> String {
        var out = "\""
        for scalar in value.unicodeScalars {
            switch scalar {
            case "\\":
                out += "\\\\"
            case "\"":
                out += "\\\""
            case "\n":
                out += "\\n"
            case "\r":
                out += "\\r"
            default:
                out.unicodeScalars.append(scalar)
            }
        }
        out += "\""
        return out
    }

    private func catchUp() {
        let root = projectRoot!
        let script = root.appendingPathComponent("scripts/catch-up.py")
        DispatchQueue.global(qos: .utility).async {
            guard FileManager.default.fileExists(atPath: script.path) else {
                return
            }
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            task.arguments = [script.path]
            task.currentDirectoryURL = root
            task.standardOutput = FileHandle.nullDevice
            task.standardError = FileHandle.nullDevice
            do {
                try task.run()
                task.waitUntilExit()
            } catch {
                return
            }
        }
    }
}

let delegate = AppDelegate()
let app = NSApplication.shared
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
