# Custom Commands for AI — Design Spec

**Date:** 2026-09-07
**Status:** Approved

## Goal

Allow users to write custom instructions that are injected into every AI prompt, giving them control over tone, style, constraints, or domain-specific rules for all generated RPS content.

## Behavior

- **Scope:** Global — one custom command applies to all AI sections (CPL, CPMK, Sub-CPMK, Deskripsi MK, Bahan Kajian, Penilaian, Pustaka)
- **Storage:** Per-project — saved in `project.content.custom_command_ai` inside the `.rps` ZIP file
- **Injection point:** End of system prompt, prefixed with `\n\nINSTRUKSI TAMBAHAN DARI PENGGUNA:\n`
- **Empty state:** If blank, no extra text is appended (no change to existing behavior)

## UI

### Ribbon Button
- Location: AI tab → Settings group → after "Master Berkas" button
- Icon: `TerminalIcon` or `KeyboardIcon` (reuse existing)
- Label: "Custom Commands"

### Dialog
- Styled like existing `AISettingsDialog` (overlay + white modal)
- Title: "Custom Commands" with X close button
- Textarea (5 rows, full width), placeholder:
  `"Contoh: Gunakan bahasa formal akademik, sertakan referensi kurikulum 2025..."`
- Helper text below textarea: "Perintah ini akan ditambahkan ke instruksi utama AI saat generate semua section."
- Buttons: "Batal" (outline) + "Simpan" (primary blue)

## Data Flow

```
User types in textarea → clicks Simpan
  → saves to project.content.custom_command_ai (in-memory)
  → auto-saved to .rps ZIP on next save/auto-save

When AI generates any section:
  getSectionPrompt(section, content) builds base prompt
  → checks content.custom_command_ai
  → if non-empty: appends "\n\nINSTRUKSI TAMBAHAN DARI PENGGUNA:\n{custom_command_ai}"
  → returns to generateWithAI()
```

## File Changes

| File | Change |
|------|--------|
| `src/components/Ribbon.tsx` | Add "Custom Commands" button in AI Settings group |
| `src/components/Editor.tsx` | Add `showCustomCommandDialog` state, `handleSaveCustomCommand` handler, dialog JSX |
| `src/services/ai.ts` | In `getSectionPrompt()`, append custom command to system prompt if present |
| `src/App.tsx` | Add `custom_command_ai` to `ProjectContent` interface default values |
| `src/styles/index.css` | (if needed) Minor dialog styles — reuse existing `.mk-dialog` or AISettingsDialog patterns |

## Example Prompt Output

```
...system prompt base...

INSTRUKSI TAMBAHAN DARI PENGGUNA:
Gunakan bahasa formal akademik. Sertakan minimal 3 referensi jurnal dari 5 tahun terakhir. Hindari penggunaan istilah asing tanpa penjelasan.
```
