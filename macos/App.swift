import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var projectRoot: URL!
    private var tipOpen = false
    private var restContentWidth: CGFloat = 400
    private let cardWidth: CGFloat = 400
    private let tipExtra: CGFloat = 336

    func applicationDidFinishLaunching(_ notification: Notification) {
        let bundle = URL(fileURLWithPath: Bundle.main.bundlePath).resolvingSymlinksInPath()
        projectRoot = bundle.deletingLastPathComponent()
        let index = projectRoot.appendingPathComponent("index.html")
        let background = NSColor(srgbRed: 13 / 255, green: 13 / 255, blue: 13 / 255, alpha: 1)

        let controller = WKUserContentController()
        controller.add(self, name: "card")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 400, height: 1100), configuration: config)
        webView.underPageBackgroundColor = background
        webView.allowsMagnification = false
        webView.navigationDelegate = self
        self.webView = webView

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 1100),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "LLM Cheat Sheet"
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
            alert.informativeText = "index.html should sit next to LLM Cheat Sheet.app."
            alert.runModal()
            NSApp.terminate(nil)
            return
        }

        refreshThenReload()
    }

    private func tallestScreen() -> NSScreen? {
        NSScreen.screens.max(by: { $0.visibleFrame.height < $1.visibleFrame.height }) ?? window.screen
    }

    private func placeOnTallestScreen() {
        guard let screen = tallestScreen() else { return }
        let visible = screen.visibleFrame
        let fitted = window.frameRect(forContentRect: NSRect(x: 0, y: 0, width: cardWidth, height: min(1100, visible.height)))
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
        }
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

    private func refreshThenReload() {
        let root = projectRoot!
        let script = root.appendingPathComponent("scripts/refresh.py")
        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard FileManager.default.isExecutableFile(atPath: script.path)
                    || FileManager.default.fileExists(atPath: script.path) else {
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
            DispatchQueue.main.async {
                self?.webView.reload()
            }
        }
    }
}

let delegate = AppDelegate()
let app = NSApplication.shared
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
