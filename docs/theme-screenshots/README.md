# Light and dark mode screenshots

Captured from the `light-dark-mode` branch with fixture data (the real screens need a login).
Each screen is shown in both modes at a phone width (390 px) and a laptop width (1280 px).

| Screen | Phone, light | Phone, dark | Laptop, light | Laptop, dark |
| --- | --- | --- | --- | --- |
| Overview | phone-light-overview.jpg | phone-dark-overview.jpg | laptop-light-overview.jpg | laptop-dark-overview.jpg |
| Today | phone-light-today.jpg | phone-dark-today.jpg | laptop-light-today.jpg | laptop-dark-today.jpg |
| Settings | phone-light-settings.jpg | phone-dark-settings-plan.jpg, phone-dark-settings-appearance.jpg | laptop-light-settings.jpg | laptop-dark-settings.jpg |
| Parent view | phone-light-parent.jpg | phone-dark-parent.jpg | laptop-light-parent.jpg | laptop-dark-parent.jpg |

Notes
- The parent view is captured through a copy of its markup and its real parts (the gauge, the chart, the same
  styles), because the real page needs a signed-in parent.
- Every screen above also passed an automated text-contrast audit of the whole page, in both modes, at both widths.
- The Settings page's new Light / Dark / System control is visible in `phone-light-settings.jpg` and
  `phone-dark-settings-appearance.jpg`.
