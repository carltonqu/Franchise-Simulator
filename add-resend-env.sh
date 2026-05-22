#!/bin/bash
# Add RESEND_API_KEY to Vercel

KEY="re_8KxJbWfS_3PYPRysSnENkyc8Jjaw1BDkt"

# Add to production
echo "$KEY" | vercel env add RESEND_API_KEY production

# Add to preview (all branches) - press Enter to accept default
echo -e "$KEY\n" | vercel env add RESEND_API_KEY preview

echo "RESEND_API_KEY added to Vercel!"
