import { Game } from './game.js';
import { LevelEditor } from './level-editor.js';
import { getLevelSettings, registerLevel, unregisterLevel } from './level-settings.js';

try {
	const customLevelStorageKey = 'sheep-custom-levels';
	const restoreCustomLevels = () => { try { const saved = JSON.parse(localStorage.getItem(customLevelStorageKey) || '{}'); Object.entries(saved).forEach(([id, level]) => registerLevel(id, { ...level, id, custom: true })); } catch {} };
	const persistCustomLevels = () => { const customLevels = Object.fromEntries(Object.entries(getLevelSettings()).filter(([id, level]) => level.custom || id.startsWith('custom-')).map(([id, level]) => [id, level])); localStorage.setItem(customLevelStorageKey, JSON.stringify(customLevels)); };
	restoreCustomLevels();
	const canvas = document.getElementById('gameCanvas');
	const game = new Game(canvas);
	const menu = document.getElementById('levelMenu');
	const levelOptions = document.getElementById('levelOptions');
	document.querySelector('.game-shell').classList.add('menu-mode');
	const success = document.getElementById('success');
	const practiceTools = document.getElementById('practiceTools');
	const escapePrompt = document.getElementById('escapePrompt');
	const deletePrompt = document.getElementById('deletePrompt');
	const levelNotice = document.getElementById('levelNotice');
	const editorPanel = document.getElementById('editorPanel');
	let pendingStarAnimation = null;
	let pendingDeleteLevelId = null;
	const returnToEditor = () => { escapePrompt.hidden = true; success.hidden = true; document.getElementById('failure').hidden = true; menu.hidden = true; game.paused = false; game.selectLevel('preview'); game.audio.playEditor(); editorPanel.hidden = false; document.querySelector('.game-shell').classList.remove('menu-mode'); editor.writeMetadata(); };
	const practiceTypes = ['green', 'yellow', 'orange', 'red', 'lightBlue', 'blue'];
	const practiceTips = [
		['Dog movement', 'Use WASD or the arrow keys to guide the dog. Walk with C for finer positioning, and use the dog\'s body position to shape the flock rather than colliding with sheep.'],
		['Sprint and stamina', 'Hold Shift to sprint and close distance quickly. Sprinting drains stamina; release Shift to recover it, and save stamina for moments when the flock needs urgent pressure.'],
		['Bark', 'Press Space to bark. Barking gives nearby sheep a strong outward push and raises their nervousness, making it useful for starting movement or breaking a stubborn group away from an obstacle.'],
		['Pressure', 'The dog creates pressure by being close to sheep. Sheep feel the dog, turn away, and move faster; nearby sheep can pass some of that pressure through the flock.'],
		['Nervousness', 'Pressure raises nervousness over time. Nervous sheep lose some flock cohesion, scatter more, and keep fleeing longer even after the dog moves away. Give them space to calm down.'],
		['Green sheep', 'Green sheep are the steady baseline flock sheep. They follow nearby sheep well and respond predictably to gentle dog pressure.'],
		['Yellow sheep', 'Yellow sheep are quicker and more sensitive than green sheep. They become nervous faster, so use lighter pressure and avoid crowding them.'],
		['Orange sheep', 'Orange sheep are independent separators. They avoid other orange and red sheep, and when nervous they can pull compatible flock sheep away from the main group.'],
		['Red sheep', 'Red sheep are the most sensitive separators. They become nervous very quickly, move fast, and can cause nearby sheep to break away. Handle them early.'],
		['Light blue sheep', 'Light blue sheep are lambs. They move more slowly, try to stay close to their blue mother, and share nervousness with her when either family member is pressured.'],
		['Blue sheep', 'Blue sheep are mothers. They are heavier and help anchor their lambs; mother and lambs share nervousness, so pressure on one can alert the whole family.'],
		['Water edge', 'Sheep are attracted to water and gather at its edge. They slow heavily and resist entering unless strong pressure forces them in.'],
		['Bushes', 'Bushes slow sheep significantly, but sheep and dogs can pass through them. Calm sheep resist entering the thickest part.'],
		['Rocks and fences', 'Rocks and fences block movement. Give the flock room to turn, and use the gaps instead of pushing directly into barriers.'],
		['Gates', 'A gate acts one way after the first sheep goes through: nearby sheep follow that crossing direction. Lead the first sheep through the opening, then let the others follow.'],
		['Reset and respawn', 'Set the exact color counts above, then choose Respawn flock to replace the current flock at its starting position. This is useful for testing one behavior at a time.']
	];
	let practiceTipIndex = 0;
	const renderPracticeTip = () => { const tip = practiceTips[practiceTipIndex]; document.getElementById('practiceTipProgress').textContent = `${practiceTipIndex + 1} / ${practiceTips.length}`; document.getElementById('practiceTipTitle').textContent = tip[0]; document.getElementById('practiceTipText').textContent = tip[1]; document.getElementById('practiceTipPrevious').disabled = practiceTipIndex === 0; document.getElementById('practiceTipNext').textContent = practiceTipIndex === practiceTips.length - 1 ? 'Start over' : 'Next tip'; };
	const updatePracticeTools = () => { practiceTools.hidden = game.levelId !== 'default'; if (!practiceTools.hidden) { practiceTypes.forEach((type) => { document.getElementById(`practiceCount-${type}`).value = game.level.sheepCounts[type] || 0; }); renderPracticeTip(); } };
	const getSavedRating = (levelId) => { try { return JSON.parse(localStorage.getItem('sheep-level-ratings') || '{}')[levelId] || 0; } catch { return 0; } };
	const getSavedTime = (levelId) => { try { return JSON.parse(localStorage.getItem('sheep-level-times') || '{}')[levelId]; } catch { return undefined; } };
	const formatBestTime = (seconds) => { const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${minutes}:${secs}`; };
	const bestTimeMarkup = (levelId) => { const time = getSavedTime(levelId); return time === undefined ? '' : `<small class="best-time">Best ${formatBestTime(time)}</small>`; };
	window.resetSheepStars = () => { localStorage.removeItem('sheep-level-ratings'); localStorage.removeItem('sheep-level-times'); renderLevelOptions(); console.log('Sheep level stars reset.'); };
	const selectLevel = (levelId) => { game.selectLevel(levelId); document.getElementById('levelSelectButton').textContent = 'Back to level select'; document.getElementById('failureLevelSelect').textContent = 'Return to selection'; menu.hidden = true; editorPanel.hidden = true; updatePracticeTools(); document.querySelector('.game-shell').classList.remove('menu-mode'); };
	const editCustomLevel = (levelId) => { const level = getLevelSettings()[levelId]; if (!level?.custom && !levelId.startsWith('custom-')) return; editor.startEditing(levelId, level); menu.hidden = true; editorPanel.hidden = false; game.audio.playEditor(); document.querySelector('.game-shell').classList.remove('menu-mode'); };
	const requestDeleteCustomLevel = (levelId) => { const level = getLevelSettings()[levelId]; if (!level?.custom) return; pendingDeleteLevelId = levelId; document.getElementById('deleteTitle').textContent = `Delete ${level.title}?`; document.getElementById('deleteMessage').textContent = 'This custom level will be removed from the selection menu.'; deletePrompt.hidden = false; document.getElementById('cancelLevelDelete').focus(); };
	const deleteCustomLevel = () => { const levelId = pendingDeleteLevelId; const level = levelId ? getLevelSettings()[levelId] : null; if (!level?.custom) return; unregisterLevel(levelId); persistCustomLevels(); try { const ratings = JSON.parse(localStorage.getItem('sheep-level-ratings') || '{}'); delete ratings[levelId]; localStorage.setItem('sheep-level-ratings', JSON.stringify(ratings)); const times = JSON.parse(localStorage.getItem('sheep-level-times') || '{}'); delete times[levelId]; localStorage.setItem('sheep-level-times', JSON.stringify(times)); } catch {} pendingDeleteLevelId = null; deletePrompt.hidden = true; if (game.levelId === levelId) game.selectLevel('preview'); renderLevelOptions(); };
	const showLevelNotice = (updated) => { document.getElementById('levelNoticeTitle').textContent = updated ? 'Changes saved' : 'Level added'; document.getElementById('levelNoticeMessage').textContent = updated ? 'Your changes are saved to this level.' : 'The level is now available in the selection menu.'; levelNotice.hidden = false; document.getElementById('closeLevelNotice').focus(); };
	const renderLevelOptions = (animate = false, previousStars = 0, expectedStars = null) => {
		levelOptions.innerHTML = '';
		const levels = getLevelSettings();
		const playableLevels = Object.entries(levels).filter(([id, level]) => id !== 'preview' && !level.testOnly);
		const ratedLevels = playableLevels.filter(([id, level]) => !level.custom);
		const randomLevels = ratedLevels.filter(([id]) => id !== 'default');
		const collectedStars = ratedLevels.reduce((total, [id]) => total + getSavedRating(id), 0);
		const totalStars = ratedLevels.length * 3;
		const totalStarsElement = document.getElementById('totalStars');
		totalStarsElement.innerHTML = `<strong>★</strong><span>${animate ? previousStars : collectedStars} / ${totalStars}</span>`;
		if (animate && expectedStars !== null && expectedStars > previousStars && collectedStars === expectedStars) {
			totalStarsElement.classList.remove('stars-arriving');
			void totalStarsElement.offsetWidth;
			totalStarsElement.classList.add('stars-arriving');
			setTimeout(() => { const started = performance.now(); const countUp = (now) => { const progress = Math.min(1, (now - started) / 6000); const eased = 1 - (1 - progress) ** 3; totalStarsElement.querySelector('span').textContent = `${Math.round(previousStars + (collectedStars - previousStars) * eased)} / ${totalStars}`; if (progress < 1) requestAnimationFrame(countUp); }; requestAnimationFrame(countUp); }, 2000);
		}
		const practice = levels.default;
		const practiceButton = document.createElement('button'); practiceButton.type = 'button'; practiceButton.dataset.level = 'default';
		const practiceRating = getSavedRating('default');
		practiceButton.innerHTML = `<strong>01</strong><span>${practice.title}</span><em class="menu-rating" aria-label="${practiceRating} of 3 stars">${'★'.repeat(practiceRating)}${'☆'.repeat(3 - practiceRating)}</em><small>${practice.name}</small>${bestTimeMarkup('default')}`;
		practiceButton.addEventListener('click', () => selectLevel('default')); levelOptions.appendChild(practiceButton);
		const randomButton = document.createElement('button'); randomButton.type = 'button'; randomButton.dataset.level = 'random';
		randomButton.innerHTML = '<strong>02</strong><span>Random Level</span><em class="menu-rating" aria-label="Random level is not rated">?</em><small>Play a randomly selected level.</small>';
		randomButton.addEventListener('click', () => { if (!randomLevels.length) return; const [id] = randomLevels[Math.floor(Math.random() * randomLevels.length)]; selectLevel(id); }); levelOptions.appendChild(randomButton);
		playableLevels.filter(([id]) => id !== 'default').forEach(([id, level], index) => {
			const isCustomLevel = Boolean(level.custom || id.startsWith('custom-'));
			const rating = getSavedRating(id); const card = document.createElement(isCustomLevel ? 'article' : 'button'); card.className = isCustomLevel ? 'level-card custom-level-card' : ''; card.type = 'button'; card.dataset.level = id;
			const ratingMarkup = isCustomLevel ? '<em class="menu-rating" aria-label="Custom levels are not rated">—</em>' : `<em class="menu-rating" aria-label="${rating} of 3 stars">${'★'.repeat(rating)}${'☆'.repeat(3 - rating)}</em>`;
			const content = `<strong>${String(index + 3).padStart(2, '0')}</strong><span>${level.title}</span>${ratingMarkup}<small>${level.name}</small>${isCustomLevel ? '' : bestTimeMarkup(id)}`;
			if (isCustomLevel) { card.innerHTML = `<button type="button" class="custom-level-open">${content}</button><button type="button" class="custom-level-delete" aria-label="Delete ${level.title}" title="Delete level">×</button><button type="button" class="custom-level-edit" aria-label="Edit ${level.title}" title="Edit level">⚙</button>`; card.querySelector('.custom-level-open').addEventListener('click', () => selectLevel(id)); card.querySelector('.custom-level-delete').addEventListener('click', (event) => { event.stopPropagation(); requestDeleteCustomLevel(id); }); card.querySelector('.custom-level-edit').addEventListener('click', (event) => { event.stopPropagation(); editCustomLevel(id); }); } else { card.innerHTML = content; card.addEventListener('click', () => selectLevel(id)); }
			levelOptions.appendChild(card);
		});
		const editorButton = document.createElement('button'); editorButton.type = 'button'; editorButton.id = 'openEditor'; editorButton.innerHTML = '<strong>+</strong><span>Level Editor</span><small>Draw a field and export it as a custom level.</small>'; editorButton.addEventListener('click', () => { menu.hidden = true; editorPanel.hidden = false; game.audio.playEditor(); document.querySelector('.game-shell').classList.remove('menu-mode'); editor.startNewLevel(); }); levelOptions.appendChild(editorButton);
	};
	const editor = new LevelEditor(document.getElementById('editorCanvas'), (id, level) => {
		const updated = Boolean(editor.editingId);
		registerLevel(id, level);
		persistCustomLevels();
		renderLevelOptions();
		showLevelNotice(updated);
	});
	document.getElementById('editorTest').addEventListener('click', () => { editor.readMetadata(); const id = `editor-test-${Date.now()}`; registerLevel(id, { ...editor.level, testOnly: true }); game.selectLevel(id); document.getElementById('levelSelectButton').textContent = 'Return to editor'; document.getElementById('failureLevelSelect').textContent = 'Return to editor'; editorPanel.hidden = true; menu.hidden = true; document.querySelector('.game-shell').classList.remove('menu-mode'); });
	renderLevelOptions();
	window.addEventListener('level-rating-updated', (event) => { pendingStarAnimation = event.detail?.improved ? event.detail : null; });
	document.getElementById('editorClose').addEventListener('click', () => { editorPanel.hidden = true; menu.hidden = false; game.selectLevel('preview'); document.querySelector('.game-shell').classList.add('menu-mode'); });
	document.getElementById('levelSelectButton').addEventListener('click', () => {
		if (game.level.testOnly) { returnToEditor(); return; }
		success.hidden = true;
		menu.hidden = false;
		game.paused = false;
		game.selectLevel('preview');
		updatePracticeTools();
		if (pendingStarAnimation) { const animation = pendingStarAnimation; pendingStarAnimation = null; renderLevelOptions(true, animation.previousTotal, animation.newTotal); } else { pendingStarAnimation = null; renderLevelOptions(); }
		document.querySelector('.game-shell').classList.add('menu-mode');
	});
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape' || game.levelId === 'preview' || !menu.hidden || !editorPanel.hidden) return;
		event.preventDefault();
		game.paused = true;
		escapePrompt.hidden = false;
		document.getElementById('escapeTitle').textContent = game.level.testOnly ? 'Return to level editor?': 'Return to level selection?';
		document.querySelector('#escapePrompt p:not(.eyebrow)').textContent = game.level.testOnly ? 'Your test run will end.': 'Your current run will be reset.';
		document.getElementById('confirmLevelSelect').textContent = game.level.testOnly ? 'Return to editor' : 'Return to selection';
		document.getElementById('cancelLevelSelect').focus();
	});
	document.getElementById('cancelLevelDelete').addEventListener('click', () => { pendingDeleteLevelId = null; deletePrompt.hidden = true; });
	document.getElementById('confirmLevelDelete').addEventListener('click', () => deleteCustomLevel());
	document.getElementById('closeLevelNotice').addEventListener('click', () => { levelNotice.hidden = true; });
	document.getElementById('cancelLevelSelect').addEventListener('click', () => { escapePrompt.hidden = true; game.paused = false; });
	document.getElementById('confirmLevelSelect').addEventListener('click', () => { if (game.level.testOnly) { returnToEditor(); return; } escapePrompt.hidden = true; menu.hidden = false; game.paused = false; game.selectLevel('preview'); updatePracticeTools(); document.querySelector('.game-shell').classList.add('menu-mode'); });
	document.getElementById('retryLevel').addEventListener('click', () => { game.reset(); game.paused = false; });
	document.getElementById('failureLevelSelect').addEventListener('click', () => { if (game.level.testOnly) { returnToEditor(); return; } document.getElementById('failure').hidden = true; menu.hidden = false; game.paused = false; game.selectLevel('preview'); updatePracticeTools(); document.querySelector('.game-shell').classList.add('menu-mode'); });
	document.getElementById('respawnPracticeFlock').addEventListener('click', () => { const counts = Object.fromEntries(practiceTypes.map((type) => [type, Math.max(0, Math.min(50, Math.floor(Number(document.getElementById(`practiceCount-${type}`).value) || 0)))])); game.respawnFlock(counts); });
	document.getElementById('practiceTipPrevious').addEventListener('click', () => { practiceTipIndex = (practiceTipIndex - 1 + practiceTips.length) % practiceTips.length; renderPracticeTip(); });
	document.getElementById('practiceTipNext').addEventListener('click', () => { practiceTipIndex = (practiceTipIndex + 1) % practiceTips.length; renderPracticeTip(); });
	renderPracticeTip();
	requestAnimationFrame((time) => game.run(time));
} catch (error) {
	window.reportGameError(error);
}
