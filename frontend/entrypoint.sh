#!/bin/sh
# Replace build-time placeholder with runtime NEXT_PUBLIC_API_URL
if [ -n "$NEXT_PUBLIC_API_URL" ] && [ "$NEXT_PUBLIC_API_URL" != "NEXT_PUBLIC_API_URL_PLACEHOLDER" ]; then
  find /app/.next -type f -name "*.js" -exec sed -i "s|NEXT_PUBLIC_API_URL_PLACEHOLDER|$NEXT_PUBLIC_API_URL|g" {} +
  echo "Replaced API URL placeholder with: $NEXT_PUBLIC_API_URL"
fi
exec "$@"
