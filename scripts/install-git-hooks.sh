#!/bin/sh
# Устанавливает prepare-commit-msg hook, убирающий Co-authored-by: Cursor
HOOK=".git/hooks/prepare-commit-msg"
cat > "$HOOK" << 'EOF'
#!/bin/sh
FILE="$1"
[ -f "$FILE" ] && sed -i '' '/Co-authored-by: Cursor/d' "$FILE" 2>/dev/null || sed -i '/Co-authored-by: Cursor/d' "$FILE" 2>/dev/null
exit 0
EOF
chmod +x "$HOOK"
echo "Hook installed: $HOOK"
