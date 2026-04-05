gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
	duration: 1.1,
	smoothWheel: true,
	syncTouch: false,
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
	lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
window.lenis = lenis;

const sendVimeoCommand = (iframe, method) => {
	iframe?.contentWindow?.postMessage(
		JSON.stringify({
			method,
		}),
		"*",
	);
};

const splitWords = (element) => {
	const text = element.textContent.trim().replace(/\s+/g, " ");
	const words = text.split(" ");
	const line = document.createElement("span");

	line.className = "word-line";

	element.setAttribute("aria-label", text);
	element.textContent = "";
	element.appendChild(line);

	words.forEach((word, index) => {
		const wordSpan = document.createElement("span");
		wordSpan.className = "word";
		wordSpan.setAttribute("aria-hidden", "true");
		wordSpan.textContent = word;
		line.appendChild(wordSpan);

		if (index < words.length - 1) {
			line.appendChild(document.createTextNode(" "));
		}
	});

	return gsap.utils.toArray(".word", element);
};

const buildSectionScroll = (section) => {
	const items = gsap.utils.toArray(".section-item", section);
	const video = section.querySelector(".video-bg");

	if (!items.length) {
		return;
	}

	gsap.set(items, {
		yPercent: 50,
		autoAlpha: 1,
	});

	const timeline = gsap.timeline({
		scrollTrigger: {
			trigger: section,
			start: "top top",
			end: () => `+=${items.length * window.innerHeight}`,
			pin: true,
			scrub: true,
			anticipatePin: 1,
			invalidateOnRefresh: true,
			onEnter: () => sendVimeoCommand(video, "play"),
			onEnterBack: () => sendVimeoCommand(video, "play"),
		},
	});

	if (video) {
		ScrollTrigger.create({
			trigger: section,
			start: "top bottom",
			end: "bottom top",
			onLeave: () => sendVimeoCommand(video, "pause"),
			onLeaveBack: () => sendVimeoCommand(video, "pause"),
		});
	}

	items.forEach((item, index) => {
		const words = splitWords(item);
		const position = index === 0 ? 0 : ">";

		gsap.set(words, {
			autoAlpha: 0,
			filter: "blur(18px)",
		});

		timeline
			.to(
				item,
				{
					yPercent: 0,
					duration: 0.9,
					ease: "power2.out",
				},
				position,
			)
			.to(
				words,
				{
					autoAlpha: 1,
					filter: "blur(0px)",
					duration: 0.65,
					stagger: 0.03,
					ease: "power2.out",
				},
				"<0.08",
			)
			.to(
				item,
				{
					yPercent: -45,
					duration: 0.9,
					ease: "power2.in",
				},
				">0.45",
			)
			.to(
				words,
				{
					autoAlpha: 0,
					filter: "blur(14px)",
					duration: 0.55,
					stagger: {
						each: 0.02,
						from: "end",
					},
					ease: "power2.in",
				},
				"<",
			);
	});
};

gsap.utils.toArray(".section").forEach(buildSectionScroll);
ScrollTrigger.refresh();
