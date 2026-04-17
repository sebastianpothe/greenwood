gsap.registerPlugin(ScrollTrigger);

const SECTION_STICKY_MULTIPLIER = 2;
const CONTENT_SHIFT_PERCENT_START = 3;
const CONTENT_SHIFT_PERCENT = -3;
const IMAGE_BG_START_SCALE = 1;
const IMAGE_BG_END_SCALE = 1.15;
const IMAGE_BG_START_BLUR = 0;
const IMAGE_BG_END_BLUR = 0;
const IMAGE_BG_START_Y_PERCENT = 4;
const IMAGE_BG_END_Y_PERCENT = 0;
const IMAGE_BG_MASK_START_OPACITY_TOP = 1;
const IMAGE_BG_MASK_START_OPACITY_BOTTOM = 0;
const IMAGE_BG_MASK_END_OPACITY_TOP = 0;
const IMAGE_BG_MASK_END_OPACITY_BOTTOM = 1;
const INITIAL_SCROLL_DISTANCE = 1200;
const BRAND_ANIMATION_START = 0;
const TRACK_ANIMATION_START = 0.12;
const TRACK_ANIMATION_END_MARGIN = 0.25;
const TRACK_FADE_DELAY = 0.2;
const HEADING_WORD_BLUR = 5;
const HEADING_WORD_STAGGER = 0.025;
const FADE_ITEM_STAGGER = 0.12;
const FADE_ITEM_Y = 16;

const getStickyDistance = (section) => section.offsetHeight * SECTION_STICKY_MULTIPLIER;
let videoPlaybackState = new WeakMap();
const videoPlaybackTriggers = [];

const createLenis = () => {
	const lenis = new Lenis();

	lenis.on("scroll", ScrollTrigger.update);
	gsap.ticker.add((time) => {
		lenis.raf(time * 1000);
	});

	return lenis;
};

const runInitialScroll = (lenis) => {
	lenis.scrollTo(INITIAL_SCROLL_DISTANCE, {
		duration: 1.2,
		easing: (t) => 1 - Math.pow(1 - t, 3),
	});
};

const sendVideoCommand = (media, method) => {
	if (!media) {
		return;
	}

	const nextState = method === "play" ? "playing" : "paused";
	const currentState = videoPlaybackState.get(media);

	if (currentState === nextState) {
		return;
	}

	if (media instanceof HTMLVideoElement) {
		if (method === "play") {
			media.play().catch(() => {});
		} else {
			media.pause();
		}
	} else {
		media.contentWindow?.postMessage(JSON.stringify({ method }), "*");
	}

	videoPlaybackState.set(media, nextState);
};

const resetVideoPlaybackState = () => {
	videoPlaybackState = new WeakMap();
};

const syncVideoPlaybackState = () => {
	videoPlaybackTriggers.forEach(({ trigger, video }) => {
		sendVideoCommand(video, trigger.isActive ? "play" : "pause");
	});
};

const splitTextIntoWords = (element) => {
	const text = element.textContent.trim().replace(/\s+/g, " ");

	if (!text) {
		return [];
	}

	const words = text.split(" ");
	const line = document.createElement("span");

	line.className = "word-line";
	element.textContent = "";
	element.appendChild(line);

	words.forEach((word, index) => {
		const wordElement = document.createElement("span");

		wordElement.className = "word";
		wordElement.textContent = word;
		line.appendChild(wordElement);

		if (index < words.length - 1) {
			line.appendChild(document.createTextNode(" "));
		}
	});

	return Array.from(line.querySelectorAll(".word"));
};

const splitHeadingWords = (heading) => {
	const splitTarget = heading.children.length === 1 ? heading.firstElementChild : heading;

	return splitTextIntoWords(splitTarget);
};

const addTrackAnimations = (section, timeline, config = {}) => {
	const track = section.querySelector(".section-track");
	const {
		headingStep = 0.14,
		headingDuration = 0.28,
		fadeStart = TRACK_ANIMATION_START + TRACK_FADE_DELAY,
		fadeDuration = 0.24,
	} = config;
	const animationEnd = 1 - TRACK_ANIMATION_END_MARGIN;

	if (!track) {
		return;
	}

	const headings = Array.from(track.querySelectorAll("h1, h2, h3, h4, h5, h6"));
	const fadeItems = Array.from(track.children).filter(
		(element) => !/^H[1-6]$/.test(element.tagName),
	);

	headings.forEach((heading, index) => {
		const words = splitHeadingWords(heading);
		const position = TRACK_ANIMATION_START + index * headingStep;
		const totalWordStagger = Math.max(0, words.length - 1) * HEADING_WORD_STAGGER;

		if (!words.length) {
			return;
		}

		gsap.set(words, {
			autoAlpha: 0,
			filter: `blur(${HEADING_WORD_BLUR}px)`,
		});

		timeline.to(
			words,
			{
				autoAlpha: 1,
				filter: "blur(0px)",
				duration: Math.max(0.12, Math.min(headingDuration, animationEnd - position - totalWordStagger)),
				stagger: HEADING_WORD_STAGGER,
				ease: "power1.out",
			},
			position,
		);
	});

	if (!fadeItems.length) {
		return;
	}

	gsap.set(fadeItems, {
		autoAlpha: 0,
		y: FADE_ITEM_Y,
	});

	const totalFadeStagger = Math.max(0, fadeItems.length - 1) * FADE_ITEM_STAGGER;

	timeline.to(
		fadeItems,
		{
			autoAlpha: 1,
			y: 0,
			duration: Math.max(0.12, Math.min(fadeDuration, animationEnd - fadeStart - totalFadeStagger)),
			stagger: FADE_ITEM_STAGGER,
			ease: "power1.out",
		},
		fadeStart,
	);
};

const setupVideoPlayback = (section) => {
	const video = section.querySelector(".video-bg");

	if (!video) {
		return;
	}

	const getVideoEndOffset = () => getStickyDistance(section) - section.offsetHeight;

	const trigger = ScrollTrigger.create({
		trigger: section,
		start: "top bottom",
		end: () => `bottom+=${getVideoEndOffset()} top`,
		onEnter: () => sendVideoCommand(video, "play"),
		onEnterBack: () => sendVideoCommand(video, "play"),
		onLeave: () => sendVideoCommand(video, "pause"),
		onLeaveBack: () => sendVideoCommand(video, "pause"),
	});

	videoPlaybackTriggers.push({ trigger, video });
};

const setupLastVideoPauseOverride = () => {
	const videoSections = gsap.utils
		.toArray(".section")
		.filter((section) => section.querySelector(".video-bg"));
	const lastVideoSection = videoSections.at(-1);
	const lastVideo = lastVideoSection?.querySelector(".video-bg");

	if (!lastVideoSection || !lastVideo) {
		return;
	}

	const getVideoEndOffset = () => getStickyDistance(lastVideoSection) - lastVideoSection.offsetHeight;

	ScrollTrigger.create({
		trigger: lastVideoSection,
		start: "top bottom",
		end: () => `bottom+=${getVideoEndOffset()} top`,
		onLeave: () => sendVideoCommand(lastVideo, "play"),
	});
};

const setupOverlayAnimation = (section) => {
	const overlay = section.querySelector(".overlay");

	if (!overlay) {
		return;
	}

	const targetOpacity = Number.parseFloat(getComputedStyle(overlay).opacity) || 0;

	gsap.set(overlay, {
		opacity: 0,
	});

	gsap.to(overlay, {
		opacity: targetOpacity,
		duration: 0.4,
		ease: "power1.out",
		scrollTrigger: {
			trigger: section,
			start: "top top",
			toggleActions: "play none none reverse",
		},
	});
};

const setupSectionScroll = (section) => {
	const content = section.querySelector(".section-content");
	const imageBg = section.querySelector(".image-bg");
	const imageBgMedia = imageBg?.querySelector("img");
	const brandLogo = section.querySelector(".brand img");

	if (!content) {
		return;
	}

	const timeline = gsap.timeline({
		scrollTrigger: {
			trigger: section,
			start: "top top",
			end: () => `+=${getStickyDistance(section)}`,
			pin: true,
			scrub: true,
			anticipatePin: 0.25,
			invalidateOnRefresh: true,
		},
	});

	timeline.fromTo(
		content,
		{ yPercent: CONTENT_SHIFT_PERCENT_START },
		{
			yPercent: CONTENT_SHIFT_PERCENT,
			duration: 1,
			ease: "none",
		},
		0,
	);

		if (imageBg) {
			gsap.set(imageBg, {
				"--image-mask-opacity-top": IMAGE_BG_MASK_START_OPACITY_TOP,
				"--image-mask-opacity-bottom": IMAGE_BG_MASK_START_OPACITY_BOTTOM,
				"--image-mask-offset-y": `${IMAGE_BG_START_Y_PERCENT}%`,
			});

			timeline.fromTo(
				imageBg,
				{
					"--image-mask-offset-y": `${IMAGE_BG_START_Y_PERCENT}%`,
				},
				{
					"--image-mask-offset-y": `${IMAGE_BG_END_Y_PERCENT}%`,
					duration: 1,
					ease: "none",
				},
			0,
		);

		if (imageBgMedia) {
			timeline.fromTo(
				imageBgMedia,
				{
					filter: `blur(${IMAGE_BG_START_BLUR}px)`,
					scale: IMAGE_BG_START_SCALE,
				},
				{
					filter: `blur(${IMAGE_BG_END_BLUR}px)`,
					scale: IMAGE_BG_END_SCALE,
					duration: 1,
					ease: "none",
				},
				0,
			);
		}

		timeline.to(
			imageBg,
			{
				"--image-mask-opacity-top": IMAGE_BG_MASK_END_OPACITY_TOP,
				"--image-mask-opacity-bottom": IMAGE_BG_MASK_END_OPACITY_BOTTOM,
				duration: 1,
				ease: "none",
			},
			0,
		);
	}

	if (brandLogo) {
		timeline.fromTo(
			brandLogo,
			{
				autoAlpha: 0,
				filter: "blur(10px)",
			},
			{
				autoAlpha: 1,
				filter: "blur(0px)",
				duration: 0.24,
				ease: "power1.out",
			},
			BRAND_ANIMATION_START,
		);
	}

	addTrackAnimations(section, timeline);
};

const setupSection = (section) => {
	setupVideoPlayback(section);
	setupOverlayAnimation(section);
	setupSectionScroll(section);
};

const init = () => {
	window.lenis = createLenis();
	gsap.utils.toArray(".section").forEach(setupSection);
	setupLastVideoPauseOverride();
	ScrollTrigger.addEventListener("refreshInit", resetVideoPlaybackState);
	ScrollTrigger.addEventListener("refresh", syncVideoPlaybackState);
	ScrollTrigger.refresh();
	runInitialScroll(window.lenis);
};

init();
