# Trial give-back pledge — new EAS schema

The existing schema cannot record the AI Builder Sponsorships trial terms, and
it cannot be altered. EAS schemas are immutable once registered, so this is a
new schema alongside the old one. **Nothing about the existing pledge changes:**
the old schema, its 29 attestations, and the current app flow all keep working
exactly as they do now.

## Why a new schema is necessary

Three independent problems with `0xbd7d42cc…20b4`, all verified against the live
Celo EAS indexer:

1. **Its attestations do not decode.** The app encoded `pledgeDetails` as a
   four-field tuple while the registered schema declares five (it has `notes`).
   EAS stores bytes without validating them against the schema, so every one was
   accepted — and `decodedDataJson` comes back empty for all of them. A control
   query against two other Celo schemas decodes normally, so this is the data,
   not the indexer. Fixed in `PledgeSign.js` for future generic pledges; the
   existing 29 cannot be repaired, and `revocable: false` means they cannot be
   withdrawn either.
2. **The counterparty is hardcoded** to "The Celo Community" at the Celo
   Governance address. The trial give-back runs 1% to Prezenti and 1% to the
   Celo Community Fund — two legs, two parties, neither expressible.
3. **There is nowhere to put the terms.** No cap, no sunset, no pro-rating, no
   covered-income definition, no ROFO, no recipient, no programme identifier.
   Putting them in `amountCommitted` as prose gives a pledge nobody can parse.

## The schema to register

```
string programId,
string recipientHandle,
uint256 sponsorshipValueUsd,
uint16 giveBackBasisPoints,
address prezentiRecipient,
uint16 prezentiBasisPoints,
address communityFundRecipient,
uint16 communityFundBasisPoints,
uint256 capUsd,
uint64 expiresAt,
uint8 monthsFundedAtSigning,
string coveredIncome,
uint16 rofoNoticeDays,
string termsUri,
bytes32 termsHash
```

**Register it as `revocable: true`.** The old schema is irrevocable, which was a
mistake: a good-faith commitment that sunsets after 36 months and pro-rates on
withdrawal needs a way to be closed out. Irrevocability does not make a promise
stronger, it just makes it impossible to correct.

Notes on specific fields:

- **Basis points, not percent strings.** `giveBackBasisPoints = 200` is 2%.
  **This is the whole of the builder's obligation and it runs to Prezenti
  only.** `prezentiBasisPoints = 200`. `communityFundBasisPoints = 100`
  records *Prezenti's* separate onward commitment to route half of what it
  receives to the Celo Community Fund -- it is not something the builder owes
  the Fund. The terms used to read "1% to Prezenti and 1% to the Celo Community
  Fund", which asked a builder to owe a third party they have no agreement
  with. See `docs/LEGAL_GAPS.md` in prezenti/talent-engine.
- **`termsUri` + `termsHash`** pin the exact wording. This is what makes the
  attestation mean something specific rather than reciting prose on-chain: the
  hash is of the versioned `docs/SPONSORSHIP_TERMS.md` in
  `prezenti/talent-engine`, and it matches the `terms_digest` the engine already
  records with every acceptance.
- **`expiresAt`** is a Unix timestamp, 36 months after the programme ends.
- **`monthsFundedAtSigning`** is the pro-rating anchor. The final figure lives
  in the engine's operating ledger as `months_funded`.
- **`coveredIncome`** is free text on purpose — it is the one term that will be
  argued about, and forcing it into an enum would hide the argument.

## Registered

**UID `0x6a5f8c4f58911419d3ae8a67df4f342eea92c0d2167b5b814eaa6d450e9135f4`**
on Celo mainnet, revocable, no resolver, 15 fields.
Transaction `0x86b9472ea9c9d6cf906285136ecbde041133010aee3c1ddef5488144e53cf45d`.
Verified by reading `getSchema(uid)` back from the registry rather than
trusting the receipt. It is wired into `src/config/trialSchema.js`.

## How it was registered

Schema registry on Celo: `0x4200000000000000000000000000000000000020`
(`SchemaRegistry.register(string schema, address resolver, bool revocable)`).

Easiest path is the UI at <https://celo.easscan.org/schema/create>. Paste the
schema above, leave the resolver as the zero address, tick **revocable**, and
sign from the Prezenti wallet.

Then put the returned UID in `src/config/trialSchema.js` as `TRIAL_SCHEMA_UID`.
The trial flow refuses to render until it is set, so a missing UID fails loudly
rather than writing to the wrong schema.

## Before any of this goes live

`docs/LEGAL_GAPS.md` in `prezenti/talent-engine` lists eight open questions,
Most of that list is now closed by drafting. Two things still land on this
schema:

- **Governing law and dispute resolution are deliberately absent.** The old
  values (`"Celo Community Governance"` and `"Celo Governance Proposals and
  Arbitration"`) are not carried forward and the new schema has no field for
  them. Naming a forum for a commitment nobody intends to enforce implies the
  opposite of what is meant.
- **Whether the disclaimer holds is still open** (question A in LEGAL_GAPS).
  A signed on-chain attestation reciting a revenue percentage with a cap and an
  expiry has the shape of an instrument whatever the text says. That question
  should be answered before the first attestation is written, not after.


## Counterparty and expiry

`PREZENTI_RECIPIENT` is Prezenti's approved long-lived Safe,
`0xA5c9389A0Ce1bFe24FF883E761Ff313225C77D44` — verified on Celo as a Gnosis
Safe v1.3.0, 2-of-3. It is deliberately *not* `0x8E3C938C…10Dbae`, which is the
historical hot/swap wallet slated for retirement: that address demonstrated
historical control, which is not the same thing as being a suitable
counterparty for a 36-month commitment.

The expiry is derived from `cohortEnd` plus `sunsetMonths` rather than
hardcoded, and it is now applied in two places that previously disagreed:

- the `expiresAt` **schema field**, and
- the attestation's own **`expirationTime`**, which was left at `0`. That made
  the on-chain object perpetual while the data inside it claimed a 36-month
  sunset. A field describing an expiry is not an expiry.

`trialSchemaReady()` fails closed unless the schema UID is set, both recipients
are valid addresses, and the derived expiry is in the future.
