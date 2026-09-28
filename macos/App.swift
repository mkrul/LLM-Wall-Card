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
    private let cardHeight: CGFloat = 564
    private let tipExtra: CGFloat = 336
    private var watchSource: DispatchSourceFileSystemObject?
    private var watchFD: Int32 = -1
    private var reloadWork: DispatchWorkItem?
    private var speechPlayer: AVAudioPlayer?
    private var speechTask: Process?
    private var progressTimer: Timer?
    private var speechGeneration = 0
    private var speechURL = ""
    private var voicesLoading = false
    private var refreshRunning = false
    private var savedOrigin: NSPoint?
    private var suppressFrameSave = false
    private var frameRestoreWork: DispatchWorkItem?
    private let frameOriginKey = "LLMWallCardOrigin"

    func applicationDidFinishLaunching(_ notification: Notification) {
        let bundle = URL(fileURLWithPath: Bundle.main.bundlePath).resolvingSymlinksInPath()
        projectRoot = bundle.deletingLastPathComponent()
        let index = projectRoot.appendingPathComponent("index.html")
        let background = NSColor(srgbRed: 13 / 255, green: 13 / 255, blue: 13 / 255, alpha: 1)

        let controller = WKUserContentController()
        controller.add(self, name: "card")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 400, height: 564), configuration: config)
        webView.underPageBackgroundColor = background
        webView.allowsMagnification = false
        webView.navigationDelegate = self
        self.webView = webView

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 564),
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

        if let origin = loadOrigin(), frameFits(origin) {
            var frame = window.frame
            frame.origin = origin
            window.setFrame(frame, display: true)
            savedOrigin = origin
        } else {
            placeOnTallestScreen()
        }
        rememberFrame()
        watchScreenChanges()

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
        let fitted = window.frameRect(forContentRect: NSRect(x: 0, y: 0, width: cardWidth, height: min(cardHeight, visible.height)))
        let frame = NSRect(
            x: visible.minX,
            y: visible.maxY - fitted.height,
            width: fitted.width,
            height: fitted.height
        )
        window.setFrame(frame, display: true)
    }

    private func fitContent(_ contentHeight: CGFloat) {
        guard contentHeight > 200 else { return }
        let screen = window.screen ?? tallestScreen()
        guard let screen else { return }
        let visible = screen.visibleFrame
        let width = tipOpen ? window.contentRect(forFrameRect: window.frame).width : cardWidth
        var height = cardHeight
        let frame = window.frameRect(forContentRect: NSRect(x: 0, y: 0, width: width, height: height))
        if frame.height > visible.height {
            let chrome = frame.height - height
            height = max(200, visible.height - chrome)
        }
        window.setContentSize(NSSize(width: width, height: height))
        rememberFrameIfStable()
    }

    private func watchScreenChanges() {
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(screensChanged),
            name: NSWorkspace.didWakeNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screensChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )
    }

    @objc private func screensChanged() {
        scheduleFrameRestore(attempt: 0)
    }

    private func scheduleFrameRestore(attempt: Int) {
        frameRestoreWork?.cancel()
        let delays = [0.35, 1.0, 2.5]
        guard attempt < delays.count else { return }
        let work = DispatchWorkItem { [weak self] in
            self?.restoreSavedFrameIfPossible()
            self?.scheduleFrameRestore(attempt: attempt + 1)
        }
        frameRestoreWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delays[attempt], execute: work)
    }

    private func loadOrigin() -> NSPoint? {
        guard let values = UserDefaults.standard.array(forKey: frameOriginKey) as? [Double], values.count == 2 else {
            return nil
        }
        return NSPoint(x: values[0], y: values[1])
    }

    private func frameFits(_ origin: NSPoint) -> Bool {
        let rect = NSRect(origin: origin, size: window.frame.size)
        return NSScreen.screens.contains { $0.frame.intersects(rect.insetBy(dx: 8, dy: 8)) }
    }

    private func rememberFrame() {
        guard !suppressFrameSave else { return }
        let frame = window.frame
        guard frame.width > 40, frame.height > 40 else { return }
        savedOrigin = frame.origin
        UserDefaults.standard.set([Double(frame.origin.x), Double(frame.origin.y)], forKey: frameOriginKey)
    }

    private func rememberFrameIfStable() {
        if let saved = savedOrigin, abs(window.frame.origin.x - saved.x) > 30 {
            return
        }
        rememberFrame()
    }

    private func userIsMovingWindow() -> Bool {
        guard let type = NSApp.currentEvent?.type else { return false }
        switch type {
        case .leftMouseDragged, .leftMouseUp, .leftMouseDown:
            return true
        default:
            return false
        }
    }

    func windowDidMove(_ notification: Notification) {
        guard !suppressFrameSave, userIsMovingWindow() else { return }
        rememberFrame()
    }

    func windowDidEndLiveResize(_ notification: Notification) {
        rememberFrame()
    }

    private func restoreSavedFrameIfPossible() {
        guard let saved = savedOrigin ?? loadOrigin() else { return }
        guard frameFits(saved) else { return }
        let current = window.frame.origin
        if abs(current.x - saved.x) < 2, abs(current.y - saved.y) < 2 {
            return
        }
        suppressFrameSave = true
        var frame = window.frame
        frame.origin = saved
        window.setFrame(frame, display: true)
        suppressFrameSave = false
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
            if let url = body["cancel"] as? String {
                self.cancelSpeech(url: url)
            }
            if let url = body["pause"] as? String {
                self.pauseSpeech(url: url)
            }
            if (body["voices"] as? Bool) == true || (body["voices"] as? NSNumber)?.boolValue == true {
                self.loadVoices()
            }
            if let voice = body["voice"] as? String {
                self.saveVoice(voice)
            }
            if let speed = body["speed"] as? NSNumber {
                self.saveSpeed(speed.doubleValue)
            }
            if let refresh = body["refresh"] as? String {
                self.refreshVisible(refresh)
            }
        }
    }

    private func loadVoices() {
        if voicesLoading {
            return
        }
        voicesLoading = true
        let root = projectRoot!
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let json = self?.fetchVoices(root: root) ?? #"{"voices":[],"selected":"","error":"Could not load voices."}"#
            DispatchQueue.main.async {
                self?.voicesLoading = false
                self?.reportVoices(json)
            }
        }
    }

    private func fetchVoices(root: URL) -> String {
        let script = root.appendingPathComponent("scripts/voices.py")
        guard FileManager.default.fileExists(atPath: script.path) else {
            return #"{"voices":[],"selected":"","error":"Could not load voices."}"#
        }
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        task.arguments = [script.path]
        task.currentDirectoryURL = root
        let output = Pipe()
        task.standardOutput = output
        task.standardError = Pipe()
        do {
            try task.run()
        } catch {
            return #"{"voices":[],"selected":"","error":"Could not load voices."}"#
        }
        let text = String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        task.waitUntilExit()
        if text.hasPrefix("{") {
            return text
        }
        return #"{"voices":[],"selected":"","error":"Could not load voices."}"#
    }

    private func reportVoices(_ json: String) {
        let js = "window.setVoices(JSON.parse(\(jsString(json))))"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func saveVoice(_ voice: String) {
        guard voice.range(of: "^[A-Za-z0-9]{8,80}$", options: .regularExpression) != nil else {
            return
        }
        let directory = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".config/llm-cheat-sheet", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("elevenlabs.voice")
        try? Data(voice.utf8).write(to: url, options: .atomic)
    }

    private func saveSpeed(_ speed: Double) {
        var clamped = (speed * 10).rounded() / 10
        if clamped < 0.7 {
            clamped = 0.7
        }
        if clamped > 1.2 {
            clamped = 1.2
        }
        let directory = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".config/llm-cheat-sheet", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("elevenlabs.speed")
        let text = String(format: "%.1f", clamped)
        try? Data(text.utf8).write(to: url, options: .atomic)
    }

    private func refreshVisible(_ which: String) {
        if refreshRunning {
            return
        }
        let name = which == "news" ? "news.py" : "refresh.py"
        let root = projectRoot!
        let script = root.appendingPathComponent("scripts").appendingPathComponent(name)
        guard FileManager.default.fileExists(atPath: script.path) else {
            reportRefresh(state: "idle", message: "Could not find the refresh script.")
            return
        }
        refreshRunning = true
        reportRefresh(state: "busy", message: "")
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            task.arguments = [script.path]
            task.currentDirectoryURL = root
            let output = Pipe()
            let errors = Pipe()
            task.standardOutput = output
            task.standardError = errors
            do {
                try task.run()
            } catch {
                DispatchQueue.main.async {
                    self?.refreshRunning = false
                    self?.reportRefresh(state: "idle", message: "Could not start the refresh.")
                }
                return
            }
            let errText = String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            _ = output.fileHandleForReading.readDataToEndOfFile()
            task.waitUntilExit()
            let code = task.terminationStatus
            let wrote = code == 0 || (name == "refresh.py" && code == 2)
            let message: String
            if wrote && errText.contains("kept the previous list") {
                message = "No newer reports. The list is unchanged."
            } else if wrote {
                message = ""
            } else {
                let line = errText.split(separator: "\n").first.map(String.init) ?? ""
                message = line.isEmpty ? "Could not refresh." : String(line.prefix(140))
            }
            DispatchQueue.main.async {
                self?.refreshRunning = false
                self?.reportRefresh(state: "idle", message: message)
            }
        }
    }

    private func reportRefresh(state: String, message: String) {
        let js = "window.setRefreshState(\(jsString(state)), \(jsString(message)))"
        webView.evaluateJavaScript(js, completionHandler: nil)
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
            rememberFrameIfStable()
        } else if !open && tipOpen {
            content.size.width = restContentWidth
            window.setFrame(window.frameRect(forContentRect: content), display: true)
            tipOpen = false
            rememberFrameIfStable()
        }
    }

    private func toggleSpeech(url: String, title: String, detail: String) {
        if speechURL == url && speechTask != nil {
            stopSpeech()
            return
        }
        if speechURL == url, let player = speechPlayer {
            if player.isPlaying {
                stopSpeech()
            } else {
                player.play()
                reportSpeech(url: url, state: "playing", message: "")
                startProgressUpdates()
            }
            return
        }
        stopSpeech()
        speechURL = url
        speechGeneration += 1
        let generation = speechGeneration
        switch beginSpeech(url: url, title: title, detail: detail) {
        case .running(let task, let output, let errors):
            reportSpeech(url: url, state: "loading", message: "")
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                task.waitUntilExit()
                let path = String(data: output.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                let finished = task.terminationStatus == 0 && path.hasPrefix("/") && FileManager.default.fileExists(atPath: path)
                let signalled = task.terminationReason == .uncaughtSignal
                let message = String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                DispatchQueue.main.async {
                    guard let self = self, generation == self.speechGeneration else { return }
                    self.speechTask = nil
                    if finished {
                        self.playSpeech(path: path, url: url)
                    } else if signalled {
                        self.speechURL = ""
                    } else {
                        self.speechURL = ""
                        self.reportSpeech(
                            url: url,
                            state: "idle",
                            message: message.isEmpty ? "Could not play that article." : message
                        )
                    }
                }
            }
        case .message(let message):
            speechURL = ""
            if !message.isEmpty {
                reportSpeech(url: url, state: "idle", message: message)
            }
        }
    }

    private enum SpeechStart {
        case running(Process, Pipe, Pipe)
        case message(String)
    }

    private func beginSpeech(url: String, title: String, detail: String) -> SpeechStart {
        let script = projectRoot.appendingPathComponent("scripts/speak.py")
        guard FileManager.default.fileExists(atPath: script.path) else {
            return .message("Could not find the speech script.")
        }
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        task.arguments = [script.path]
        task.currentDirectoryURL = projectRoot
        let input = Pipe()
        let output = Pipe()
        let errors = Pipe()
        task.standardInput = input
        task.standardOutput = output
        task.standardError = errors
        speechTask = task
        do {
            try task.run()
        } catch {
            speechTask = nil
            return .message("Could not start audio.")
        }
        let payload: [String: String] = ["url": url, "title": title, "detail": detail]
        if let data = try? JSONSerialization.data(withJSONObject: payload) {
            input.fileHandleForWriting.write(data)
        }
        try? input.fileHandleForWriting.close()
        return .running(task, output, errors)
    }

    private func cancelSpeech(url: String) {
        guard speechURL == url, speechTask != nil else { return }
        stopSpeech()
    }

    private func pauseSpeech(url: String) {
        guard speechURL == url, let player = speechPlayer else { return }
            if player.isPlaying {
                player.pause()
                reportProgress()
                stopProgressUpdates()
                reportSpeech(url: url, state: "paused", message: "")
            } else {
                player.play()
                reportSpeech(url: url, state: "playing", message: "")
                startProgressUpdates()
            }
    }

    private func playSpeech(path: String, url: String) {
        do {
            let player = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: path))
            player.delegate = self
            speechPlayer = player
            player.play()
            reportSpeech(url: url, state: "playing", message: "")
            startProgressUpdates()
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
        stopProgressUpdates()
        reportSpeech(url: url, state: "idle", message: "")
    }

    private func stopSpeech() {
        stopProgressUpdates()
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

    private func startProgressUpdates() {
        progressTimer?.invalidate()
        let timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in
            self?.reportProgress()
        }
        RunLoop.main.add(timer, forMode: .common)
        progressTimer = timer
        reportProgress()
    }

    private func stopProgressUpdates() {
        progressTimer?.invalidate()
        progressTimer = nil
    }

    private func reportProgress() {
        guard let player = speechPlayer, !speechURL.isEmpty else { return }
        let duration = player.duration
        let fraction = duration > 0 ? min(1, max(0, player.currentTime / duration)) : 0
        let js = "window.setSpeechProgress(\(jsString(speechURL)), \(fraction))"
        webView.evaluateJavaScript(js, completionHandler: nil)
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
