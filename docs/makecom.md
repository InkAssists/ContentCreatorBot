# Make.com Setup Guide

This project sends finalized posts to a Make.com Custom Webhook. Make.com is responsible for distributing the payload to social media platforms.

## Scenario structure

1. Create a new scenario in Make.com.
2. Add `Webhooks` -> `Custom webhook` as the first module.
3. Copy the webhook URL into `.env` as `MAKE_WEBHOOK_URL`.
4. Run the webhook once in Make.com so it waits for sample data.
5. Create and approve a test post in Telegram.
6. Add a `Router` after the webhook.
7. Add one route per social platform.
8. Add filters based on the `platforms` array.
9. Connect the required social media modules and map the payload fields.
10. Activate the scenario.

## Payload fields

```json
{
  "post_id": 42,
  "text": "Raw post text without hashtags or link.",
  "text_post": "Final text including hashtags and website link.",
  "image_url": "https://example.com/image.jpg",
  "platforms": ["facebook", "twitter", "instagram"],
  "hashtags": "#Example #Content",
  "link": "https://example.com",
  "scheduled_at": null
}
```

## Recommended mappings

- Post body: `text_post`
- Media URL: `image_url`
- Link field, if available: `link`
- Router filters: `platforms`

## Example route filters

- Facebook route: `platforms contains facebook`
- Instagram route: `platforms contains instagram`
- X route: `platforms contains twitter`
- LinkedIn route: `platforms contains linkedin`, if you add that platform value in the bot or map it in Make.com

## Image handling

When an image is uploaded directly to Telegram, the bot resolves it to a Telegram file URL and sends that URL as `image_url`. This is convenient for testing and small workflows.

For production workflows, consider adding an upload step in Make.com before publishing:

- Upload to Cloudinary, S3, Google Drive, or another asset host.
- Use the returned public media URL in the social platform module.
- Avoid long-term dependency on Telegram file URLs because they include the bot token in the access path.

## Operational notes

- Keep Make.com scenarios active after testing.
- Re-run the webhook detection if the payload schema changes.
- Review each platform module's current media requirements. Instagram and LinkedIn frequently have stricter media constraints than text-only platforms.
- Add error routes or notifications in Make.com for failed social publishing steps.
