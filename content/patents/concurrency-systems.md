---
title: Concurrency Systems
category: PATENTS
order: 20
summary: Thread synchronization and concurrent execution innovations.
tags:
  - patent
  - synchronization
  - runtime
kind: patent
icon: git-branch
featured: false
url: https://patents.google.com/patent/US10198279B2
---
# thread-synchronization.md

## Patent

**US10198279B2 — Thread synchronization for platform neutrality**

A system performs thread synchronization across layers of code that implement an application, including native code, system code, and code in a virtual machine (“VM”). The system makes a call by the native code to the system code; and sends a message by the system code to the code in the VM. The system then sends a first response by the code in the VM to the system code; and sends a second response by the system code to the native code, where each one of the native code, the system code, and the code in the VM implements wait and notify functionality for communication with other codes that implement the application.


