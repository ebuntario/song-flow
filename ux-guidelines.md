# UX Guidelines: Don't Make Me Think

Reference for all UI/UX decisions in TangTingTung.

---

## Krug's Laws

### 1. Don't Make Users Think

- Every screen should be self-evident
- If you need to explain, you've failed
- Obvious beats clever every time

### 2. Every Click Must Be Obvious

- Users should never wonder "What do I click?"
- Primary action = prominent, single, clear
- Secondary actions = subdued, grouped

### 3. Omit Needless Words

- Get rid of half the words, then half again
- No parenthetical explanations in UI
- Labels should be 1-3 words max

### 4. Users Scan, They Don't Read

- Use clear visual hierarchy
- Important info at top/left
- Chunk related items together

---

## Nielsen's Heuristics

### 1. System Status Visibility

- Always show what state we're in
- Loading indicators, success/error feedback
- Never leave users wondering "did it work?"

### 2. Match Real World Language

- Use "Bills" not "Scheduled Transactions"
- Use "Jan 25 - Feb 24" not "This Cycle"
- Use Indonesian where appropriate

### 3. User Control & Freedom

- Always provide escape routes (back, cancel)
- Undo over confirmation dialogs
- Don't trap users in flows

### 4. Consistency

- Same action = same UI everywhere
- One term per concept (never synonyms)
- Consistent icon meanings

### 5. Error Prevention

- Disable impossible actions
- Confirm destructive actions only
- Smart defaults that are usually right

### 6. Recognition Over Recall

- Show options, don't make users remember
- Use familiar patterns (iOS/Android native)
- Repeat key info where needed

### 7. Flexibility & Efficiency

- Swipe gestures for power users
- Touch targets ≥44pt
- Shortcuts after learning basics

### 8. Aesthetic & Minimalist

- Every element earns its place
- White space is not wasted space
- Remove before adding

### 9. Help Users Recover

- Clear, human error messages
- Suggest the fix
- Never blame the user

### 10. Documentation

- Best UI needs no docs
- If needed: inline, contextual
- Onboarding = progressive disclosure

---

## TangTingTung Specific Rules

### Mobile First

- Design for 375pt width first
- Test on iPhone SE (smallest common)
- Desktop is enlarged mobile, not redesigned

### Touch Targets

- Minimum 44×44pt
- 8pt spacing between targets
- Full-width rows preferred

### Buttons

- One primary action per screen
- Primary = filled, prominent position
- Secondary = text or outline

### Dialogs

- Avoid when possible (inline better)
- Max 2 actions (Cancel + Primary)
- Primary on right, bolder

### Lists

- Swipe actions over drill-in menus
- Show key info in row (don't force tap)
- Group naturally (by date, by recipient)

### Forms

- Inline validation (not on submit)
- Smart defaults always
- Keyboard type matches field

### Numbers

- Right-align amounts
- Use Indonesian format: Rp 16.305.000
- Abbreviate millions: 16.3jt (WhatsApp only)

---

## Checklist Before Shipping

- [ ] Can a new user understand this in 3 seconds?
- [ ] Is the primary action obvious?
- [ ] Did I remove unnecessary words?
- [ ] Is terminology consistent with rest of app?
- [ ] Does error state help user fix it?
- [ ] Works on iPhone SE width?
- [ ] Touch targets ≥44pt?

---

_See also: docs/reference/dont_make_me_think.pdf_
