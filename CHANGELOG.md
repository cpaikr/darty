# Changelog

## [0.5.0](https://github.com/sjunepark/darty/compare/v0.4.0...v0.5.0) (2026-06-22)


### ⚠ BREAKING CHANGES

* Bare `darty` now prints a JSON home envelope instead of human help, and commands missing required options now return JSON `invalid_request` failures with exit code 1 instead of help text.

### Features

* add agent-oriented CLI workflow output ([1141658](https://github.com/sjunepark/darty/commit/1141658116cc8b9ca73967ec061b5bfa57c4f881))
* add agent-oriented CLI workflow output ([abcf727](https://github.com/sjunepark/darty/commit/abcf7279752d466629ec82c33eac92adce74d6bf))
* add agent-oriented CLI workflow output ([3ca90fb](https://github.com/sjunepark/darty/commit/3ca90fbad71141d49d33900d18c15e22eb055bcf))


### Bug Fixes

* preserve search follow-up diagnostics ([69bf74a](https://github.com/sjunepark/darty/commit/69bf74a58e8c9a887ff82fd406d21eb8ce6311c7))

## [0.4.0](https://github.com/sjunepark/darty/compare/v0.3.4...v0.4.0) (2026-05-29)


### ⚠ BREAKING CHANGES

* remove Pi package adapter
* finalize 0.4.0 package surface

### Features

* add toolset validation recovery metadata ([764c3ed](https://github.com/sjunepark/darty/commit/764c3ed690ab7e76ba64f2585b0a5a8b6411bf93))
* finalize 0.4.0 package surface ([05c4a84](https://github.com/sjunepark/darty/commit/05c4a8406edae50063f140c03fa3c59b7f6367b3))
* remove Pi package adapter ([0bb1e35](https://github.com/sjunepark/darty/commit/0bb1e35444bce050ce3ad50dc3eb50535e3b8617))
* restore trusted server toolset export ([c61154f](https://github.com/sjunepark/darty/commit/c61154f2762866ab4acdbc7a99d765d2b98565a5))


### Bug Fixes

* **evals:** parse search-body request options in agent CLI eval ([1c5b891](https://github.com/sjunepark/darty/commit/1c5b891b2f2507a5c20cbebdb0318a093adbe679))

## [0.3.4](https://github.com/sjunepark/darty/compare/v0.3.3...v0.3.4) (2026-05-28)


### Features

* **evals:** add Pi single-tool evaluation suites ([620dd95](https://github.com/sjunepark/darty/commit/620dd9545aa807c565179f85b9d5b3686ba24d82))
* preserve DART source response diagnostics ([55554b5](https://github.com/sjunepark/darty/commit/55554b5f047185efe882799a09f998834e6a1af7))
* preserve Darty execution diagnostics ([0fe5857](https://github.com/sjunepark/darty/commit/0fe58579799af078582aebeab401839389b725b8))

## [0.3.3](https://github.com/sjunepark/darty/compare/v0.3.2...v0.3.3) (2026-05-25)


### Bug Fixes

* keep Darty tool status copy English ([323254c](https://github.com/sjunepark/darty/commit/323254c80952d53748d1e673bf44fcd6815ba914))

## [0.3.2](https://github.com/sjunepark/darty/compare/v0.3.1...v0.3.2) (2026-05-24)


### Features

* improve CLI recovery and workflow help ([1363ad8](https://github.com/sjunepark/darty/commit/1363ad89ace1b42c801323a0b59f31709a88974d))

## [0.3.1](https://github.com/sjunepark/darty/compare/v0.3.0...v0.3.1) (2026-05-24)


### Bug Fixes

* reject overly wide company report date windows ([465930d](https://github.com/sjunepark/darty/commit/465930ddc642397f0fa3e564aec10cc438077c11))

## [0.3.0](https://github.com/sjunepark/darty/compare/v0.2.1...v0.3.0) (2026-05-24)


### ⚠ BREAKING CHANGES

* Standalone OS-native darty binaries and binary release assets are no longer built or published. Install and run the Node-based npm CLI instead.

### Code Refactoring

* remove standalone binary release support ([48e559d](https://github.com/sjunepark/darty/commit/48e559d2b427448d628b292dc8405bd4c4cce9fa))

## [0.2.1](https://github.com/sjunepark/darty/compare/v0.2.0...v0.2.1) (2026-05-24)


### Features

* add DART report guide command ([4e2a1c9](https://github.com/sjunepark/darty/commit/4e2a1c99c89bafd78deba057b4d2d795eb38dd77))

## [0.2.0](https://github.com/sjunepark/darty/compare/v0.1.3...v0.2.0) (2026-05-24)


### ⚠ BREAKING CHANGES

* search-body concise/default results no longer include filing.documentNumber. Use detailed or raw response detail when DART locator fields are needed for source verification; use filing.receiptNumber or references.viewerUrl for view-report follow-up calls.

### Bug Fixes

* keep Darty tool description purpose-only ([dde0164](https://github.com/sjunepark/darty/commit/dde016479e1cf65ce02852e992a8951e5922ec69))
* localize Darty tool-facing copy ([baaedb0](https://github.com/sjunepark/darty/commit/baaedb0c2147e5de074a860c8bf55472a3dc9101))
* refine agent tool schemas from eval failures ([b91f8c1](https://github.com/sjunepark/darty/commit/b91f8c1cd8695c9363ca76b6da2dbfd60d291364))

## [0.1.1](https://github.com/sjunepark/darty/compare/v0.1.0...v0.1.1) (2026-05-21)


### Features

* add validation recovery metadata to toolset ([40096bd](https://github.com/sjunepark/darty/commit/40096bd02ed19b4eb4261f2bd42c8a82969390c2))
* add validation recovery metadata to toolset ([f6b3a7c](https://github.com/sjunepark/darty/commit/f6b3a7c6fc4649881cd4029a379489cd7fe8f560))


### Bug Fixes

* defer unused retry input recovery action ([ba567c5](https://github.com/sjunepark/darty/commit/ba567c582d219421b3b517f41c8d9f2c6a6dfa89))

## [0.1.0](https://github.com/sjunepark/darty/compare/v0.0.10...v0.1.0) (2026-05-21)


### ⚠ BREAKING CHANGES

* @sjunepark/darty/pi now exports a single darty tool via createDartyPiTool/registerDartyPiTool. The previous plural progressive Pi tool exports and multi-tool adapter surface are removed.

### Features

* expose a single Pi SDK darty tool ([8529bd2](https://github.com/sjunepark/darty/commit/8529bd25065d767bef101de259e891c07477fdcd))

## [0.0.10](https://github.com/sjunepark/darty/compare/v0.0.9...v0.0.10) (2026-05-21)


### Features

* add SDK-owned toolset help and validation ([68194e9](https://github.com/sjunepark/darty/commit/68194e9eb4f584abc33dfde3fbb929e14cbd3e6b))
* add SDK-owned toolset help and validation ([3186d1e](https://github.com/sjunepark/darty/commit/3186d1e195b5624b23e1ff0d7236d804c997d1ed))

## [0.0.9](https://github.com/sjunepark/darty/compare/v0.0.8...v0.0.9) (2026-05-21)


### Bug Fixes

* clean up Korean package README ([6f0320a](https://github.com/sjunepark/darty/commit/6f0320a4175f229220f4c00eae0514c5aa31b614))
* declare domhandler runtime dependency ([9cc6fba](https://github.com/sjunepark/darty/commit/9cc6fbaad59aa505a911eee8df1af6ca15b46244))
* emit shared ESM package subpaths ([276614f](https://github.com/sjunepark/darty/commit/276614f6ff5e4534ed44ea8de9a4a41d5e83293f))

## [0.0.8](https://github.com/sjunepark/darty/compare/v0.0.7...v0.0.8) (2026-05-20)


### Features

* add agent-native workflow evals ([7e3b7b4](https://github.com/sjunepark/darty/commit/7e3b7b4615ba40cbe36cf4ab110c627c69edb0b9))
* add no-result warnings and limit recovery hints ([27e4c75](https://github.com/sjunepark/darty/commit/27e4c75e85b90d2193be26daf9088a5774f79b44))
* add response detail controls ([b45f616](https://github.com/sjunepark/darty/commit/b45f616d1be79d9ffb76f6290f0b269b379767a2))
* add reusable toolset and Pi adapter ([6673fff](https://github.com/sjunepark/darty/commit/6673fff9448310edd73c34604fc8ebd0abbdadf1))


### Bug Fixes

* clarify ambiguous disclosure warnings ([adf0cf8](https://github.com/sjunepark/darty/commit/adf0cf83234de19291ca9e9103172b29ba0bd6ac))
* improve DART disclosure type guidance ([01c3a06](https://github.com/sjunepark/darty/commit/01c3a0603fb9f8340a76c34881926c9f74cad648))

## [0.0.7](https://github.com/sjunepark/darty/compare/v0.0.6...v0.0.7) (2026-05-20)


### Features

* add disclosure type discovery helper ([9e36204](https://github.com/sjunepark/darty/commit/9e36204ce106e4a84fc79b8440b652fc746947c7))
* add recovery hints to capability failures ([9e0baa4](https://github.com/sjunepark/darty/commit/9e0baa41de70a70b6742b31b47bfae15b7ade9bc))
* **agent-tools:** expose company helper tools ([a048566](https://github.com/sjunepark/darty/commit/a0485662f72e762a7e3be867ce7a27a3c82a9f17))
* clarify disclosure type category matches ([19fc7c0](https://github.com/sjunepark/darty/commit/19fc7c0bf11fc383f716739a071b7609fa861bb2))
* clarify view-report identifiers ([5cf2ce1](https://github.com/sjunepark/darty/commit/5cf2ce1f1a2cef17e8c76bf9f3358e9413335ae3))
* enrich capability schemas for agent tools ([8e15bc1](https://github.com/sjunepark/darty/commit/8e15bc14497b97011fc68ada5e9817531d183439))
* expose auditable disclosure type matches ([7d2b38f](https://github.com/sjunepark/darty/commit/7d2b38f9d0a62880ef2c6619f2730594e29f568a))


### Bug Fixes

* clarify DART filter code inputs ([dc685ae](https://github.com/sjunepark/darty/commit/dc685ae915f00f492541b8694001e026bec4f635))
* **evals:** preserve native tool assertion output ([582d110](https://github.com/sjunepark/darty/commit/582d11058d6211e4e34d5d7fdf31c0fe2a47b9cb))

## Changelog

This file is maintained by Release Please.
