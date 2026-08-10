# Installer Customization (Tauri)

Tauri bundler support custom install wizard on both Windows and macOS.

## Windows (NSIS) — license + custom wizard graphic

```json
"bundle": {
  "windows": {
    "nsis": {
      "license": "../LICENSE.rtf",
      "headerImage": "installer/header.bmp",
      "sidebarImage": "installer/sidebar.bmp",
      "installerIcon": "icons/icon.ico",
      "installMode": "currentUser"
    }
  }
}
```

- `license` — force accept-checkbox page before install proceed. Need `.rtf` file.
- `headerImage` — top banner, 150x57 BMP.
- `sidebarImage` — welcome/finish page graphic, 164x314 BMP. This the "wizard" look customization.

**WiX (MSI) alt:** `bundle.windows.wix.license` — needs `.rtf`, no image customization though. NSIS better for that.

## macOS (DMG) — drag-to-Applications style

```json
"bundle": {
  "macOS": {
    "dmg": {
      "background": "installer/dmg-bg.png",
      "windowSize": { "width": 660, "height": 400 },
      "appPosition": { "x": 180, "y": 170 },
      "applicationFolderPosition": { "x": 480, "y": 170 }
    }
  }
}
```

Mac finder-drag DMG got no license/EULA step natively — that's `.pkg` installer territory (different bundler, Apple's `productbuild`), not what Tauri DMG target does. Tauri only emit `.app`/`.dmg`, not `.pkg`.

## Not done yet

`.pkg` w/ EULA on mac — need custom `productbuild` + `distribution.xml`, outside Tauri bundler. Add if mac install must show terms screen too.
