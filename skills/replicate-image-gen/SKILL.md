---
name: replicate_image_gen
description: Generate images via Replicate (Stable Diffusion / SDXL) API and download locally.
metadata: {"openclaw": {"emoji": "🖼️", "requires": {"env": ["REPLICATE_API_TOKEN"]}, "primaryEnv": "REPLICATE_API_TOKEN"}}
---

# Replicate Image Generation (SDXL)

Use this skill when the user asks you to generate an image.

## Inputs to ask for (if missing)

- Prompt (what to draw)
- Aspect ratio / size (default: 1024x1024)
- Style constraints (optional)
- Negative prompt (optional)

## Safety / policy

- Do not generate disallowed content.
- If user requests a trademarked character/logo in a confusing way, clarify.

## Procedure (OpenClaw tools)

1) Build the Replicate request.
   - Use model: `stability-ai/sdxl` (or another SDXL model if requested).

2) Call Replicate Predictions API with `exec` (curl).

3) Poll until `status == succeeded`.

4) Download the resulting image URL to `./out/<safe_name>.png` using `exec`.

## Curl templates

### Create prediction

```bash
curl -sS https://api.replicate.com/v1/predictions \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "version": "stability-ai/sdxl",
  "input": {
    "prompt": "<PROMPT>",
    "width": 1024,
    "height": 1024,
    "negative_prompt": "<NEGATIVE_PROMPT>"
  }
}
JSON
```

### Get prediction

```bash
curl -sS https://api.replicate.com/v1/predictions/<PREDICTION_ID> \
  -H "Authorization: Token $REPLICATE_API_TOKEN"
```

### Download

```bash
mkdir -p out
curl -L "<IMAGE_URL>" -o "out/<NAME>.png"
```

## Output

- Provide the local file path and (if requested) send it as an attachment on Telegram.
