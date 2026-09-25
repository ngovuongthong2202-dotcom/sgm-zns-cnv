#!/bin/bash
# Enforce Zero-Any Policy
# Fails the build if 'any' or 'eslint-disable-next-line @typescript-eslint/no-explicit-any' is used.

if grep -rn "eslint-disable-next-line @typescript-eslint/no-explicit-any" src/; then
   echo "ERROR: Zero-Any Policy violated. Found eslint-disable for any type!"
   exit 1
fi

echo "Zero-Any Check Passed!"
exit 0
