# Phone web companion

Reuse upstream translations and art in a React/Vite interface with Scan, Library, and Saved navigation. Camera permission is requested by tapping Open camera. Photos can also be uploaded, cropped and rotated. General and playing-card detail views include bilingual skills, effects and FAQ; rules are searchable. Saved cards stay on the device.

Recognition runs a bounded image upload through a Vercel Python function: grayscale, CLAHE illumination correction, ORB local features, global LSH retrieval, per-reference ratio matching and RANSAC homography verification. This supports a card rotated or tilted on a table and partial lighting changes. Skin images resolve to their base card. Weak evidence is rejected; similar editions are shown as alternatives. No API key or paid model is needed. Uploaded images are processed in memory and are not saved by the application.

Browser Tesseract OCR is a fallback when artwork is unrecognized or unavailable. It reads traditional/simplified Chinese and English from the original and contrast-normalized crop, including a vertical-name pass. Text is normalized before matching names, printed IDs and skills. Browser models load on demand. Search and browse remain available if recognition fails.

Validation: recognition tests use held-out synthetic brightness, shadow, glare, perspective, rotation and blur variants across database cards, plus negative controls. These test transformations of reference art, not a measured accuracy guarantee on real phone photos. Real prints, unseen skins, severe blur and obscured images remain limitations. Native Flutter regressions fix token loss for vertically separated names and corruption of alphanumeric ID suffixes; native tests require Flutter.
