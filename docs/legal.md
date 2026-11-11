# Legal and contribution policy

This document is not legal advice. It records the constraints the project works
under.

## Emulation is generally lawful

Emulators have been upheld as lawful in the United States, notably *Sony
Computer Entertainment v. Connectix* (9th Cir. 2000) and *Sony Computer
Entertainment America v. Bleem* (9th Cir. 2000). Reverse engineering for
interoperability is protected in many jurisdictions.

That does not make everything around an emulator lawful.

## Rules this project follows

1. **Own dumps only.** Users must dump games and firmware from hardware they own.
   The project never hosts, links to, or facilitates obtaining games, firmware
   or keys.
2. **No keys, no firmware.** Do not commit, distribute or request decryption
   keys, firmware images, or anything derived from them.
3. **No circumvention.** Do not implement or distribute technology whose primary
   purpose is circumventing a technological protection measure (DMCA §1201 and
   equivalents). This is a real risk for a *hardware product*; it is one more
   reason this project is software and non-commercial by default.
4. **Clean-room implementations.** HLE code is written from observed behaviour
   and public documentation. Do not copy leaked SDK headers, proprietary source,
   or decompiled code from Sony.
5. **No patents knowingly infringed.** If a technique is patented in a relevant
   jurisdiction, document it and seek an alternative.
6. **Trademarks.** Do not use Sony marks as branding; "Prospero" here is a
   codename reference, not a claim of affiliation.

## Contribution policy

A pull request is rejected if it contains:

- game data, firmware, keys, or links to them;
- leaked SDKs or proprietary code;
- code whose stated purpose is DRM circumvention;
- decompiled Sony code rather than an independent implementation.

## Why this matters for the plan

- A free, non-commercial emulator has a well-trodden legal path.
- A hardware product that runs PS5 games has a much riskier one.
- Keeping the project software-only is both an engineering decision (see
  [plan.md](plan.md) §2) and a legal one.
