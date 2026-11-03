# Privacy Policy (App Summary)

This document explains what data TwoFold stores, who can see it, and how media
and OCR (receipt scanning) are handled. It is a plain-language summary for end
users; the authoritative rules live in `firestore.rules` and `storage.rules`.

## Data stored

| Data | Where | Visible to |
|------|-------|-----------|
| Profile (name, pairings, preferences, language, currency, timezone) | Firestore `/users/{uid}` | You; your partner (for display); nobody else |
| Group/relationship data (balances, streaks) | Firestore `/groups/{groupId}` | Group members only |
| Tasks, transactions, milestones, memories, savings goals | Firestore collection docs | Group members only |
| Nudges | Firestore `/nudges/{nudgeId}` | Sender and recipient only |
| Uploaded photos/videos (when enabled) | Cloud Storage `/groups/{groupId}/memories/...` | Group members only |
| Receipts during scanning | Cloud Storage `/users/{uid}/pending/...` (deleted after OCR) | You only |
| Invite codes | Firestore `/invite_codes/...` | Nobody reads codes; claim happens server-side |

## Partner visibility

Pairing shares read access to a limited set of profile fields and to shared
group collections. Your email address and auth credentials are **not** exposed
to your partner beyond what is required for pairing.

## Media

- Media uploads are currently **disabled** ("Coming Soon") to conserve free
  storage quotas.
- When enabled, uploads are validated by content type and size, stored under
  your group's path, and only group members can view them.

## Receipt OCR

- Receipt images are uploaded to your private temporary area, sent to the OCR
  backend, and deleted after processing.
- The model's extraction is **not** written to your ledger automatically —
  you review and confirm the fields before they are saved.
- No receipt image or extracted text is shared with your partner outside the
  saved transaction you explicitly confirm.

## Account deletion

Deleting your account removes your profile, your group's data (if solo), your
nudges, invites, and access to group-shared documents, executed by a backend
job. Shared-group scenarios may require unpairing first so no partner data is
orphaned.

## Contact

For privacy questions, open an issue on the repository
(`guangyou0716/TwoFold`) or contact the maintainers directly.