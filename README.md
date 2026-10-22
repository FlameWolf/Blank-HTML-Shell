# Blank HTML Shell
Click on home-page repository to fork a blank HTML shell for your Github account.

## Projectile motion simulator

[Trajectory](index.html) is a responsive projectile motion playground built with plain HTML, CSS, JavaScript, and Matter.js 0.20.0. It includes light/dark themes, angle/velocity/height/gravity controls, Earth/Moon/Mars presets, pause/resume/reset, playback speed, trajectory and velocity overlays, and live measurements.

### Run locally

Install the pinned physics dependency with `npm ci`, then open `index.html` in your browser. Alternatively, run `python3 -m http.server 8000` from this directory and visit <http://localhost:8000>. Node.js/npm are required to install the dependency; Python is only needed for the optional server. No build step or CDN connection is needed after installation.

For static hosting, include `index.html`, `styles.css`, `script.js`, and `node_modules/matter-js/build/matter.min.js` at the same relative paths after running `npm ci`; the dependency is not committed to the repository.

### Explore

- Adjust the sliders or numeric fields, then select **Launch projectile**. The same button pauses/resumes a flight or launches another after landing.
- **Reset simulation** clears the flight but keeps your settings. Settings are locked during flight; reset to change them.
- The dashed curve is the ideal prediction; the solid trail and live measurements come from the Matter.js simulation. Axes automatically fit each launch and retain the same meter scale horizontally and vertically.
- Gravity presets change only gravity. Playback speed changes how fast time passes, not the physics.
- Use the theme button to switch light/dark mode. The initial theme follows your system preference, and your choice is saved when browser storage is available.

### Physics

The simulator models a point projectile without air resistance. Matter.js advances at a fixed 120 Hz in meter-based world coordinates; resizing only changes rendering. A half-step initial velocity correction aligns Verlet integration with the ideal ballistic trajectory. Ground crossing is interpolated between steps and ends the flight (no bounce). Peak height is the highest sampled point, and the final speed is the speed at impact. Hidden tabs pause automatically.

There are no build, lint, or test scripts in this repository. To check manually, launch the defaults (45°, 20 m/s, zero height, Earth): flight time should be about 2.88 s, range 40.77 m, and peak height 10.19 m. Also check pause/resume, reset, a vertical launch, launch from a height, planet presets, both themes, and narrow-screen layouts.

## Examples

- [View Transition API](view-transitions/): an interactive guide with seven live demos in one standalone HTML file, plus a multi-page cross-document demo.
