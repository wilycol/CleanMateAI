---
name: "communication-protocol"
description: "MANDATORY: Invoke this skill IMMEDIATELY for EVERY user message. It ensures the assistant ALWAYS (1) interprets the user's intent and (2) communicates the plan BEFORE taking any action."
---

# Communication Protocol & Intent Verification

**CRITICAL INSTRUCTION**: You must invoke this skill at the VERY BEGINNING of every single response to a user message.

## Purpose
To eliminate ambiguity and panic by ensuring the user knows exactly what you understood and what you are about to do.

## Procedure (Strict Order)

1.  **Analyze & Interpret**: Read the user's prompt carefully.
2.  **State Intent**: Before writing any code or running any command, you must explicitly state:
    *   "He entendido que quieres..." (Interpretation)
    *   "Mi plan es..." (Action Plan)
3.  **Wait for Implicit Approval**: By stating the plan clearly first, you give the user a chance to read it. (In this async chat format, stating it clearly at the top of the response serves this purpose).

## Response Template (Must be at the top of your reply)

```markdown
### 🧠 Interpretación y Plan
**Entendido:** [Resumen de lo que pidió el usuario]
**Plan de Acción:**
1. [Paso 1]
2. [Paso 2]
...
```

## Example

**User:** "Fix the bug in the login page."

**Assistant (via Skill):**
### 🧠 Interpretación y Plan
**Entendido:** Hay un error en el inicio de sesión que necesita reparación.
**Plan de Acción:**
1. Investigar el archivo `login.py`.
2. Reproducir el error.
3. Aplicar la corrección y verificar.
```
