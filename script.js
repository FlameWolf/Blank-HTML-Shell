(() => {
	"use strict";

	const $ = (id) => document.getElementById(id);
	const themeButton = $("theme-toggle");
	const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
	let savedTheme = null;
	let redraw = () => {};

	try {
		const stored = localStorage.getItem("trajectory-theme");
		if (stored === "light" || stored === "dark") savedTheme = stored;
	} catch {
		// The simulator also works when browser storage is unavailable.
	}

	function applyTheme(theme) {
		document.documentElement.dataset.theme = theme;
		themeButton.setAttribute("aria-pressed", String(theme === "dark"));
		themeButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
		redraw();
	}

	applyTheme(savedTheme || (systemTheme.matches ? "dark" : "light"));
	themeButton.addEventListener("click", () => {
		savedTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
		applyTheme(savedTheme);
		try {
			localStorage.setItem("trajectory-theme", savedTheme);
		} catch {
			// Theme changes remain available for the current page.
		}
	});
	systemTheme.addEventListener("change", () => {
		if (!savedTheme) applyTheme(systemTheme.matches ? "dark" : "light");
	});

	if (!window.Matter) {
		$("load-error").hidden = false;
		$("status-text").textContent = "Physics unavailable";
		return;
	}

	const { Engine, Bodies, Body, Composite } = window.Matter;
	const canvas = $("simulation-canvas");
	const context = canvas.getContext("2d");
	if (!context) {
		$("load-error").textContent = "This browser cannot display the simulation. Please use a browser with Canvas support.";
		$("load-error").hidden = false;
		$("status-text").textContent = "Canvas unavailable";
		return;
	}

	const settings = { angle: 45, velocity: 20, height: 0, gravity: 9.81 };
	const engine = Engine.create();
	const STEP = 1000 / 120;
	const BASE_SECONDS = 1 / 60;
	const keys = Object.keys(settings);
	let projectile = null;
	let state = "ready";
	let elapsed = 0;
	let peakHeight = 0;
	let speed = settings.velocity;
	let trail = [];
	let position = { x: 0, y: 0 };
	let velocity = { x: 0, y: 0 };
	let accumulator = 0;
	let lastFrame = null;
	let animation = null;
	let view = { width: 0, height: 0 };

	function prediction() {
		const radians = settings.angle * Math.PI / 180;
		const vx = settings.velocity * Math.cos(radians);
		const vy = settings.velocity * Math.sin(radians);
		const time = (vy + Math.sqrt(vy * vy + 2 * settings.gravity * settings.height)) / settings.gravity;
		return {
			vx,
			vy,
			time,
			range: vx * time,
			peak: settings.height + vy * vy / (2 * settings.gravity)
		};
	}

	function updateMetrics() {
		$("metric-time").value = elapsed.toFixed(2);
		$("metric-distance").value = Math.max(0, position.x).toFixed(2);
		$("metric-height").value = peakHeight.toFixed(2);
		$("metric-speed").value = speed.toFixed(2);
	}

	function setState(next) {
		state = next;
		const names = { ready: "Ready to launch", running: "In flight", paused: "Paused", landed: "Landed" };
		const actions = { ready: "Launch projectile", running: "Pause flight", paused: "Resume flight", landed: "Launch again" };
		$("status-text").textContent = names[state];
		$("simulation-status").dataset.state = state;
		$("launch").dataset.state = state;
		$("launch").querySelector("span").textContent = actions[state];
		$("launch-settings").disabled = state === "running" || state === "paused";
		$("chart-tip").hidden = state !== "ready";
		$("control-hint").textContent = state === "running" || state === "paused"
			? "Reset your flight to adjust the launch controls."
			: "Your next great discovery is a launch away.";
		$("speed-caption").textContent = state === "landed" ? "Speed at impact" : state === "ready" ? "Ready for liftoff" : "Speed along the trajectory";
	}

	function stopAnimation() {
		if (animation !== null) cancelAnimationFrame(animation);
		animation = null;
		lastFrame = null;
		accumulator = 0;
	}

	function reset() {
		stopAnimation();
		Composite.clear(engine.world, false);
		Engine.clear(engine);
		engine.timing.timestamp = 0;
		projectile = null;
		elapsed = 0;
		peakHeight = settings.height;
		speed = settings.velocity;
		position = { x: 0, y: settings.height };
		const expected = prediction();
		velocity = { x: expected.vx, y: expected.vy };
		trail = [];
		setState("ready");
		$("flight-announcement").textContent = "";
		$("insight-text").textContent = settings.height > 0
			? "A head start changes everything. Launching from a height keeps your projectile in the air longer — and shifts the best angle below 45°."
			: settings.gravity < 3
				? "Less gravity, more hang time. The Moon’s weaker pull lets the same launch travel about six times farther than on Earth."
				: "On level ground, a 45° launch gives you the greatest range. Try a different angle and see for yourself.";
		canvas.setAttribute("aria-label", `Predicted trajectory: ${expected.range.toFixed(2)} meters of range, ${expected.peak.toFixed(2)} meters peak height, ${expected.time.toFixed(2)} seconds in flight. Live measurements are below the chart.`);
		updateMetrics();
		draw();
	}

	function syncControls(key, value) {
		const slider = $(key);
		const number = $(`${key}-number`);
		const min = Number(slider.min);
		const max = Number(slider.max);
		const step = Number(slider.step);
		const parsed = Number(value);
		const bounded = value.trim() === "" || !Number.isFinite(parsed) ? settings[key] : Math.min(max, Math.max(min, parsed));
		settings[key] = Number((Math.round((bounded - min) / step) * step + min).toFixed(2));
		slider.value = String(settings[key]);
		number.value = String(settings[key]);
		slider.style.setProperty("--fill", `${(settings[key] - min) / (max - min) * 100}%`);
		slider.setAttribute("aria-valuetext", `${settings[key]} ${key === "angle" ? "degrees" : key === "velocity" ? "meters per second" : key === "gravity" ? "meters per second squared" : "meters"}`);
		document.querySelectorAll("[data-gravity]").forEach((button) => {
			button.setAttribute("aria-pressed", String(Number(button.dataset.gravity) === settings.gravity));
		});
	}

	keys.forEach((key) => {
		syncControls(key, String(settings[key]));
		$(key).addEventListener("input", (event) => {
			syncControls(key, event.target.value);
			reset();
		});
		$(`${key}-number`).addEventListener("change", (event) => {
			syncControls(key, event.target.value);
			reset();
		});
	});

	document.querySelectorAll("[data-gravity]").forEach((button) => {
		button.addEventListener("click", () => {
			syncControls("gravity", button.dataset.gravity);
			reset();
		});
	});

	function launch() {
		reset();
		const expected = prediction();
		// Matter uses distance per millisecond squared for gravity, and per 1/60s for velocity.
		// One world unit is one meter; screen scaling never changes the physics.
		engine.gravity.x = 0;
		engine.gravity.y = settings.gravity;
		engine.gravity.scale = 1 / 1000000;
		projectile = Bodies.circle(0, -settings.height, .15, {
			frictionAir: 0,
			friction: 0,
			restitution: 0
		});
		// A half-step offset makes the fixed-step Verlet positions match the ballistic curve.
		Body.setVelocity(projectile, {
			x: expected.vx * BASE_SECONDS,
			y: (-expected.vy - settings.gravity * STEP / 2000) * BASE_SECONDS
		});
		Composite.add(engine.world, projectile);
		trail.push({ ...position });
		setState("running");
		$("flight-announcement").textContent = "Projectile launched.";
		animation = requestAnimationFrame(frame);
	}

	function advance() {
		const previous = { ...position };
		const previousVelocity = { ...velocity };
		Engine.update(engine, STEP);
		position = { x: projectile.position.x, y: -projectile.position.y };
		const rawVelocity = Body.getVelocity(projectile);
		velocity = {
			x: rawVelocity.x / BASE_SECONDS,
			y: -(rawVelocity.y / BASE_SECONDS + settings.gravity * STEP / 2000)
		};
		let fraction = 1;
		if (position.y <= 0 && velocity.y <= 0) {
			// Resolve the ground intersection even when the entire flight fits in one step.
			const impactTime = (previousVelocity.y + Math.sqrt(previousVelocity.y ** 2 + 2 * settings.gravity * previous.y)) / settings.gravity;
			fraction = Math.min(1, Math.max(0, impactTime / (STEP / 1000)));
			position = { x: previous.x + (position.x - previous.x) * fraction, y: 0 };
			velocity.y = previousVelocity.y + (velocity.y - previousVelocity.y) * fraction;
			Body.setPosition(projectile, { x: position.x, y: 0 });
			Body.setStatic(projectile, true);
			setState("landed");
		}
		elapsed += STEP / 1000 * fraction;
		peakHeight = Math.max(peakHeight, position.y);
		speed = Math.hypot(velocity.x, velocity.y);
		trail.push({ ...position });
		if (state === "landed") {
			$("flight-announcement").textContent = `Landed after ${elapsed.toFixed(2)} seconds, traveling ${position.x.toFixed(2)} meters with a peak height of ${peakHeight.toFixed(2)} meters.`;
			canvas.setAttribute("aria-label", $("flight-announcement").textContent);
		}
	}

	function frame(timestamp) {
		animation = null;
		if (state !== "running") return;
		if (lastFrame !== null) {
			accumulator += Math.min(timestamp - lastFrame, 100) * Number($("playback-speed").value);
		}
		lastFrame = timestamp;
		while (accumulator >= STEP && state === "running") {
			advance();
			accumulator -= STEP;
		}
		updateMetrics();
		draw();
		if (state === "running") animation = requestAnimationFrame(frame);
	}

	$("launch").addEventListener("click", () => {
		if (state === "running") {
			stopAnimation();
			setState("paused");
		} else if (state === "paused") {
			setState("running");
			animation = requestAnimationFrame(frame);
		} else {
			launch();
		}
	});
	$("reset").addEventListener("click", reset);
	["show-trajectory", "show-vectors"].forEach((id) => $(id).addEventListener("change", draw));
	document.addEventListener("visibilitychange", () => {
		if (document.hidden && state === "running") {
			stopAnimation();
			setState("paused");
		}
	});

	function tickStep(span) {
		const rough = span / 6;
		const magnitude = 10 ** Math.floor(Math.log10(rough));
		const normalized = rough / magnitude;
		return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
	}

	function draw() {
		if (!view.width || !view.height) return;
		const style = getComputedStyle(document.documentElement);
		const color = (name) => style.getPropertyValue(name).trim();
		const accent = color("--accent");
		const muted = color("--subtle");
		const expected = prediction();
		const left = view.width < 400 ? 43 : 57;
		const right = 30;
		const top = 61;
		const bottom = view.height - 65;
		const plotWidth = view.width - left - right;
		const plotHeight = bottom - top;
		const scale = Math.min(plotWidth / Math.max(10, expected.range * 1.17), plotHeight / Math.max(6, expected.peak * 1.55));
		const x = (meters) => left + meters * scale;
		const y = (meters) => bottom - meters * scale;
		const maxX = plotWidth / scale;
		const maxY = plotHeight / scale;
		const xStep = tickStep(maxX);
		const yStep = tickStep(maxY);
		const label = (value) => Number(value.toFixed(2)).toString();
		context.clearRect(0, 0, view.width, view.height);
		context.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
		context.lineWidth = 1;
		context.strokeStyle = color("--grid");
		context.fillStyle = muted;
		context.textAlign = "center";
		context.textBaseline = "top";
		for (let value = 0; value <= maxX; value += xStep) {
			context.beginPath();
			context.moveTo(x(value), top);
			context.lineTo(x(value), bottom);
			context.stroke();
			context.fillText(label(value), x(value), bottom + 12);
		}
		context.textAlign = "right";
		context.textBaseline = "middle";
		for (let value = 0; value <= maxY; value += yStep) {
			context.beginPath();
			context.moveTo(left, y(value));
			context.lineTo(view.width - right, y(value));
			context.stroke();
			context.fillText(label(value), left - 13, y(value));
		}
		context.fillStyle = color("--surface-alt");
		context.fillRect(left, bottom + 1, plotWidth, 6);
		context.strokeStyle = color("--ground");
		context.beginPath();
		context.moveTo(left, bottom);
		context.lineTo(view.width - right, bottom);
		context.stroke();

		if ($("show-trajectory").checked) {
			context.beginPath();
			for (let i = 0; i <= 160; i++) {
				const time = expected.time * i / 160;
				const px = x(expected.vx * time);
				const py = y(Math.max(0, settings.height + expected.vy * time - .5 * settings.gravity * time * time));
				if (i === 0) context.moveTo(px, py);
				else context.lineTo(px, py);
			}
			context.strokeStyle = color("--accent-line");
			context.lineWidth = 2;
			context.setLineDash([5, 6]);
			context.stroke();
			context.setLineDash([]);
			if (expected.range > 1) {
				context.beginPath();
				context.arc(x(expected.range), bottom, 4, 0, Math.PI * 2);
				context.fillStyle = color("--surface");
				context.fill();
				context.strokeStyle = color("--accent-line");
				context.stroke();
				context.fillStyle = muted;
				context.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
				context.textAlign = "center";
				context.fillText(`${expected.range.toFixed(1)} m`, x(expected.range), bottom - 16);
			}
			if (trail.length > 1) {
				context.beginPath();
				trail.forEach((point, index) => {
					if (index === 0) context.moveTo(x(point.x), y(point.y));
					else context.lineTo(x(point.x), y(point.y));
				});
				context.strokeStyle = accent;
				context.lineWidth = 2.5;
				context.stroke();
				context.fillStyle = accent;
				const stride = Math.max(1, Math.ceil(trail.length / 22));
				for (let i = 0; i < trail.length; i += stride) {
					context.beginPath();
					context.arc(x(trail[i].x), y(trail[i].y), 2.5, 0, Math.PI * 2);
					context.fill();
				}
			}
		}

		const px = x(position.x);
		const py = y(position.y);
		if (settings.height > 0) {
			context.setLineDash([3, 4]);
			context.strokeStyle = color("--accent-line");
			context.beginPath();
			context.moveTo(left, y(settings.height));
			context.lineTo(left, bottom);
			context.stroke();
			context.setLineDash([]);
		}
		if ($("show-vectors").checked && state !== "landed") {
			const length = 35 + Math.min(speed, 40);
			const magnitude = Math.hypot(velocity.x, velocity.y);
			if (magnitude > .01) {
				const dx = velocity.x / magnitude * length;
				const dy = -velocity.y / magnitude * length;
				const angle = Math.atan2(dy, dx);
				context.strokeStyle = accent;
				context.lineWidth = 1.8;
				context.beginPath();
				context.moveTo(px, py);
				context.lineTo(px + dx, py + dy);
				context.moveTo(px + dx - 7 * Math.cos(angle - .45), py + dy - 7 * Math.sin(angle - .45));
				context.lineTo(px + dx, py + dy);
				context.lineTo(px + dx - 7 * Math.cos(angle + .45), py + dy - 7 * Math.sin(angle + .45));
				context.stroke();
			}
			if (state === "ready" && settings.angle > 0) {
				context.beginPath();
				context.arc(px, py, 27, -settings.angle * Math.PI / 180, 0);
				context.strokeStyle = color("--accent-line");
				context.lineWidth = 1;
				context.stroke();
				context.fillStyle = accent;
				context.textAlign = "left";
				context.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
				context.fillText(`${settings.angle}°`, px + 34, py - 12);
			}
		}
		context.fillStyle = accent;
		context.globalAlpha = .12;
		context.beginPath();
		context.arc(px, py, 15, 0, Math.PI * 2);
		context.fill();
		context.globalAlpha = 1;
		context.beginPath();
		context.arc(px, py, 7, 0, Math.PI * 2);
		context.fill();
		context.strokeStyle = color("--surface");
		context.lineWidth = 2.5;
		context.stroke();
		context.fillStyle = color("--surface");
		context.globalAlpha = .75;
		context.beginPath();
		context.arc(px - 1.7, py - 1.7, 1.5, 0, Math.PI * 2);
		context.fill();
		context.globalAlpha = 1;
	}

	function resize() {
		const bounds = canvas.parentElement.getBoundingClientRect();
		view = { width: bounds.width, height: bounds.height };
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(view.width * ratio);
		canvas.height = Math.round(view.height * ratio);
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		draw();
	}

	redraw = draw;
	new ResizeObserver(resize).observe(canvas.parentElement);
	window.addEventListener("resize", resize);
	$("launch").disabled = false;
	$("reset").disabled = false;
	reset();
	resize();
})();
