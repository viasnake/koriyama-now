module.exports = {
  ci: {
    collect: {
      startServerCommand: "npx vite preview --host 127.0.0.1 --port 4174",
      startServerReadyPattern: "Local:",
      url: [
        "http://127.0.0.1:4174/",
        "http://127.0.0.1:4174/news",
        "http://127.0.0.1:4174/search?type=place&category=aed"
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox"
      }
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.5 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.85 }],
        "categories:seo": ["error", { minScore: 0.9 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci"
    }
  }
};
