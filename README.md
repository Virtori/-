# BodyDream Coach 4.4

Offline Android coach: strength sessions, football, exercise technique, local journal and JSON backups.

## What's new

- Previous weights and repetitions beside the active exercise, with optional copying into unfinished rows. RIR must be entered again.
- Full or express sessions. Express keeps three selected exercises per strength plan.
- Equipment substitutions for bench press, leg press and Romanian deadlift, with separate exercise IDs, technique cues and weight history.
- Detailed session journal and weekly workload: completed strength sets, primary muscle groups, recorded average RIR and football days. Week comparisons use the same elapsed weekdays.
- Rest timer extension by 30 seconds.
- Progression checks all working sets, explicit RIR, two distinct dates, equal weights, current readiness and recent pain. Exercise variants never share load suggestions. The app's conservative thresholds are product rules, not a clinical protocol.

## Install and transfer

4.4 uses application ID `com.bodydream.trainer.coach`. It installs alongside 4.2/4.3, whose ephemeral CI debug keys were not retained. In the old app, Settings → Save JSON; in 4.4, Settings → Restore. Verify history and photos before removing the old installation. Version-4 backups remain compatible; 4.4 adds optional session `format` and `swaps` fields.

## Durable private signing

CI creates an unsigned release APK and runs rules and browser tests. The deliverable is signed outside GitHub with a durable private key, then its certificate and APK structure are verified. The signing key bundle is retained privately with the user's files and is NEVER committed or attached to a public Actions run. All future APKs for this application ID must reuse that same bundle to support in-place updates.

Use `tools/sign-apk.py --apk UNSIGNED.apk --signer apksigner.jar --key-bundle PRIVATE.zip --out SIGNED.apk`. If the bundle is unavailable, recover it before producing a new signed release; do not silently generate a replacement key for an existing installation.

## Validation

Actions checks JS syntax, progression and normalization rules, legacy backups, short sessions, exercise substitutions, rest timing, session restoration and the journal. Browser checks cover 320–768px widths. UI images use synthetic test data. The physical Redmi installation still needs a device check.

## Training references

- ACSM 2026 position stand: https://doi.org/10.1249/MSS.0000000000003897
- ACSM summary: https://www.acsm.org/resistance-training-guidelines-update-2026/
- NASM exercise library: https://www.nasm.org/resource-center/exercise-library

The exercise library is educational. Recommendations derive from the user's entries and cannot verify actual technique. No camera AI, cloud coach or automatic calendar write is connected.
