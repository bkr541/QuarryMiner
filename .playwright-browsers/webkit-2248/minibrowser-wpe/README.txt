Bundle details:
  - WebKit Platform: WPE
  - Configuration: Release
  - Bundle type: MiniBrowser
  - Builder date: 2026-01-14T20:15:26.664944
  - Builder OS: Ubuntu 22.04.5 LTS

Required dependencies:
  - This bundle depends on several system libraries that are assumed to be installed.
  - To ensure all the required libraries are installed execute the script: install-dependencies.sh
  - You can pass the flag "--autoinstall" to this script to automatically install the dependencies if needed.

Run instructions:
  - Execute the wrappers in this directory:
    * MiniBrowser
    * WPEWebDriver

Notes:
  - Do not execute any binary from the "bin" subdir as it will not run directly. Use the WPEWebDriver detailed above.
  - This bundle was generated with the script "Tools/Scripts/generate-bundle" available on the WebKit repository.
  - Please report bugs at https://bugs.webkit.org (Product: WebKit and Component: WebKitGTK or WPEWebKit).
