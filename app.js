// Pharm Match - Drug Attribute Matching Game

class PharmMatch {
    constructor() {
        this.drugs = [];
        this.currentDrugIndex = 0;
        this.score = 0;
        this.totalCorrect = 0;
        this.totalAttempts = 0;
        this.perfectMatches = 0;
        this.missedItems = [];
        this.selectedOptions = new Map(); // category -> option element
        this.currentOptions = [];
        this.currentDrug = null;

        this.categories = [
            { key: 'moa', name: 'Mechanism of Action', field: 'Mechanism of Action' },
            { key: 'indications', name: 'Indications', field: 'Clinical Indications' },
            { key: 'adverse', name: 'Adverse Events', field: 'Adverse Events' },
            { key: 'interactions', name: 'Interactions', field: 'Drug Interactions' },
            { key: 'contraindications', name: 'Contraindications', field: 'Contraindications' }
        ];

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Setup elements
        this.setupPanel = document.getElementById('setup-panel');
        this.gamePanel = document.getElementById('game-panel');
        this.resultsPanel = document.getElementById('results-panel');
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.fileName = document.getElementById('file-name');
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.dataPreview = document.getElementById('data-preview');
        this.drugCount = document.getElementById('drug-count');
        this.drugListPreview = document.getElementById('drug-list-preview');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.clearDataBtn = document.getElementById('clear-data-btn');

        // Tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Game elements
        this.currentDrugNum = document.getElementById('current-drug-num');
        this.totalDrugs = document.getElementById('total-drugs');
        this.scoreDisplay = document.getElementById('score');
        this.drugNameDisplay = document.getElementById('drug-name');
        this.optionsContainer = document.getElementById('options-container');
        this.trackerItems = document.querySelectorAll('.tracker-item');
        this.submitBtn = document.getElementById('submit-btn');
        this.skipBtn = document.getElementById('skip-btn');
        this.feedback = document.getElementById('feedback');
        this.feedbackContent = document.getElementById('feedback-content');
        this.nextDrugBtn = document.getElementById('next-drug-btn');
        this.backToSetupBtn = document.getElementById('back-to-setup-btn');

        // Results elements
        this.finalScore = document.getElementById('final-score');
        this.correctDrugs = document.getElementById('correct-drugs');
        this.accuracy = document.getElementById('accuracy');
        this.missedItemsContainer = document.getElementById('missed-items');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.newSetBtn = document.getElementById('new-set-btn');
    }

    initEventListeners() {
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Sample data
        this.loadSampleBtn.addEventListener('click', () => this.loadSampleData());

        // Control buttons
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.clearDataBtn.addEventListener('click', () => this.clearData());
        this.submitBtn.addEventListener('click', () => this.submitAnswer());
        this.skipBtn.addEventListener('click', () => this.skipDrug());
        this.nextDrugBtn.addEventListener('click', () => this.nextDrug());
        this.backToSetupBtn.addEventListener('click', () => this.showSetup());
        this.playAgainBtn.addEventListener('click', () => this.startGame());
        this.newSetBtn.addEventListener('click', () => this.showSetup());
    }

    switchTab(tabId) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-tab`);
        });
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        this.fileName.textContent = file.name;
        const reader = new FileReader();

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        reader.onload = (event) => {
            try {
                if (file.name.endsWith('.json')) {
                    this.parseJSON(event.target.result);
                } else if (file.name.endsWith('.csv')) {
                    this.parseCSV(event.target.result);
                } else if (isExcel) {
                    this.parseExcel(event.target.result);
                }
                this.showDataPreview();
            } catch (error) {
                alert('Error parsing file: ' + error.message);
                console.error(error);
            }
        };

        if (isExcel) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }

    parseExcel(data) {
        // Use SheetJS to parse Excel file
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '' // Default value for empty cells
        });

        if (!jsonData || jsonData.length === 0) {
            throw new Error('No data found in Excel file');
        }

        this.drugs = this.normalizeDrugs(jsonData);
    }

    parseJSON(content) {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error('JSON must be an array of objects');
        }
        this.drugs = this.normalizeDrugs(data);
    }

    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have header and at least one data row');
        }

        const headers = this.parseCSVLine(lines[0]);
        const drugs = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const drug = {};
                headers.forEach((header, index) => {
                    drug[header.trim()] = values[index] ? values[index].trim() : '';
                });
                drugs.push(drug);
            }
        }

        this.drugs = this.normalizeDrugs(drugs);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    normalizeDrugs(data) {
        return data.map((item, index) => ({
            id: index,
            name: item['Drug Name'] || item['name'] || `Drug ${index + 1}`,
            moa: item['Mechanism of Action'] || item['moa'] || '',
            indications: item['Clinical Indications'] || item['indications'] || '',
            adverse: item['Adverse Events'] || item['adverse'] || '',
            interactions: item['Drug Interactions'] || item['interactions'] || '',
            contraindications: item['Contraindications'] || item['contraindications'] || ''
        })).filter(drug => {
            // Only include drugs that have at least some data
            return drug.moa || drug.indications || drug.adverse ||
                   drug.interactions || drug.contraindications;
        });
    }

    loadSampleData() {
        // Sample pharmacology data
        this.drugs = [
            {
                id: 0,
                name: "Dopamine (Intropin)",
                moa: "Dose-dependent effects: Low-dose stimulates D1/D2 receptors, Intermediate-dose binds β-1 receptors, High-dose α-1 activity dominates",
                indications: "Hemodynamic support and inotropic support in advanced heart failure",
                adverse: "Severe hypertension, Ventricular arrhythmias, Cardiac ischemia, Tissue ischemia/gangrene",
                interactions: "",
                contraindications: ""
            },
            {
                id: 1,
                name: "Norepinephrine (Levophed)",
                moa: "Potent α-1 effects with modest β effects. Reflex bradycardia usually occurs in response to increased MAP",
                indications: "Preferred vasopressor in septic, cardiogenic, and hypovolemic shock and ACLS",
                adverse: "Arrhythmias, Bradycardia, Peripheral (digital) ischemia, HTN",
                interactions: "Nonselective β-blockers can cause HTN",
                contraindications: ""
            },
            {
                id: 2,
                name: "Epinephrine (Adrenalin)",
                moa: "Potent β-1 activity and moderate β-2 and α-1 effects. β effects > at low doses. α-1 effects > at higher doses",
                indications: "Treatment of anaphylaxis, ACLS (asystole/pulseless arrest), 2nd-line agent in septic shock",
                adverse: "Ventricular arrhythmias, Severe HTN, Cardiac ischemia, Sudden cardiac death",
                interactions: "",
                contraindications: ""
            },
            {
                id: 3,
                name: "Lisinopril (Prinivil, Zestril)",
                moa: "Inhibits ACE in the lungs. Block conversion of angiotensin I to angiotensin II. Inhibit inactivation of bradykinin",
                indications: "HTN: 1st-line option. Always use in patients with DM, CKD if no CI. AMI, HF",
                adverse: "Hyperkalemia, Hypotension, Acute Renal Failure, Dry Cough, Angioedema",
                interactions: "",
                contraindications: "Pregnancy: Fetotoxic"
            },
            {
                id: 4,
                name: "Metoprolol succinate (Toprol XL)",
                moa: "β-adrenergic receptor antagonist → Decrease CO → Decrease sympathetic outflow → Inhibit renin release. Cardioselective",
                indications: "Heart failure, Acute MI, Angina, Arrhythmias, Hypertension",
                adverse: "CNS Effects, Sexual Dysfunction, Asthma/COPD Exacerbation, mask symptoms of hypoglycemia",
                interactions: "Do NOT combine with non-DHP CCBs",
                contraindications: "Caution with selective agents in asthma"
            },
            {
                id: 5,
                name: "Furosemide (Lasix)",
                moa: "Inhibit renal Na+(Cl-) reabsorption and co-transport of Na+/K+/2Cl- in the thick ascending loop of Henle",
                indications: "Pulmonary edema, Peripheral edema, Heart failure, Acute hypercalcemia",
                adverse: "Ototoxicity (rapid IV), Hypovolemia, K wasting, Hyperuricemia, Hypomagnesemia",
                interactions: "Monitor all electrolytes",
                contraindications: "Avoid w/ sulfa allergy"
            },
            {
                id: 6,
                name: "Warfarin",
                moa: "Inhibits activation of vitamin K dependent clotting factors (Seven, Nine, Ten, Two). Also inhibits proteins C and S",
                indications: "Prophylaxis of DVT and PE, Stroke prophylaxis in atrial fibrillation, Mechanical heart valve",
                adverse: "Bleeding, Teratogenic, Skin necrosis",
                interactions: "Amiodarone, Fluoroquinolones, Azole antifungals increase INR. Rifampin, Phenytoin decrease INR",
                contraindications: "Hemorrhagic tendencies, Pregnancy, Hepatic impairment"
            },
            {
                id: 7,
                name: "Atorvastatin (Lipitor)",
                moa: "Inhibit HMG-CoA reductase. Inhibit cholesterol synthesis. Increase cell-surface LDL receptors. Stabilize plaques",
                indications: "First line therapy. Primary and secondary prevention of ASCVD",
                adverse: "Myalgias, Myopathy and rhabdomyolysis, Hepatotoxicity, Increased risk of diabetes",
                interactions: "CYP3A4",
                contraindications: "Pregnancy"
            },
            {
                id: 8,
                name: "Clopidogrel",
                moa: "Inhibit binding of ADP to P2Y12 receptors on platelets → inhibit activation of GP IIb/IIIa receptors. Irreversible",
                indications: "Prevention of atherosclerotic events, Prophylaxis of thrombotic events in ACS, PCI with stenting",
                adverse: "Bleeding, thrombotic thrombocytopenic purpura",
                interactions: "CYP 2C19 (activates prodrug). DDI with omeprazole and esomeprazole",
                contraindications: "Active bleed"
            },
            {
                id: 9,
                name: "Amiodarone",
                moa: "Class III: prolong repolarization. Sometimes designated as potassium channel blockers. Prolong APD without altering phase 0",
                indications: "Atrial and ventricular arrhythmias",
                adverse: "Pulmonary toxicity, Thyroid dysfunction, Hepatotoxicity, Corneal deposits",
                interactions: "Drug Interactions! Many including warfarin, digoxin, statins",
                contraindications: "Severe sinus node dysfunction, AV block"
            }
        ];
        this.showDataPreview();
    }

    showDataPreview() {
        this.dataPreview.classList.remove('hidden');
        this.drugCount.textContent = this.drugs.length;
        this.drugListPreview.innerHTML = this.drugs.map(d => d.name).join(', ');
        this.startGameBtn.disabled = this.drugs.length < 2;
        this.clearDataBtn.disabled = false;
    }

    clearData() {
        this.drugs = [];
        this.dataPreview.classList.add('hidden');
        this.startGameBtn.disabled = true;
        this.clearDataBtn.disabled = true;
        this.fileName.textContent = '';
        this.fileInput.value = '';
    }

    startGame() {
        this.currentDrugIndex = 0;
        this.score = 0;
        this.totalCorrect = 0;
        this.totalAttempts = 0;
        this.perfectMatches = 0;
        this.missedItems = [];

        // Shuffle drugs
        this.drugs = this.shuffle([...this.drugs]);

        this.setupPanel.classList.add('hidden');
        this.resultsPanel.classList.add('hidden');
        this.gamePanel.classList.remove('hidden');

        this.totalDrugs.textContent = this.drugs.length;
        this.updateScore();
        this.loadDrug();
    }

    loadDrug() {
        this.currentDrug = this.drugs[this.currentDrugIndex];
        this.selectedOptions.clear();
        this.feedback.classList.add('hidden');
        this.submitBtn.disabled = true;

        // Update UI
        this.currentDrugNum.textContent = this.currentDrugIndex + 1;
        this.drugNameDisplay.textContent = this.currentDrug.name;

        // Reset tracker
        this.trackerItems.forEach(item => item.classList.remove('selected'));

        // Generate options
        this.generateOptions();
    }

    generateOptions() {
        this.currentOptions = [];
        const usedTexts = new Set();

        // Add correct answers for each category
        this.categories.forEach(cat => {
            const correctText = this.currentDrug[cat.key];
            if (correctText && correctText.trim()) {
                this.currentOptions.push({
                    category: cat.key,
                    categoryName: cat.name,
                    text: correctText,
                    isCorrect: true
                });
                usedTexts.add(correctText.toLowerCase());
            }
        });

        // Add distractors from other drugs
        const otherDrugs = this.drugs.filter(d => d.id !== this.currentDrug.id);

        this.categories.forEach(cat => {
            // Get distractor for this category
            const distractorPool = otherDrugs
                .filter(d => d[cat.key] && d[cat.key].trim() && !usedTexts.has(d[cat.key].toLowerCase()))
                .map(d => d[cat.key]);

            if (distractorPool.length > 0) {
                const distractor = distractorPool[Math.floor(Math.random() * distractorPool.length)];
                this.currentOptions.push({
                    category: cat.key,
                    categoryName: cat.name,
                    text: distractor,
                    isCorrect: false
                });
                usedTexts.add(distractor.toLowerCase());
            }
        });

        // Shuffle options
        this.currentOptions = this.shuffle(this.currentOptions);

        // Render options
        this.renderOptions();
    }

    renderOptions() {
        this.optionsContainer.innerHTML = '';

        this.currentOptions.forEach((option, index) => {
            const card = document.createElement('div');
            card.className = 'option-card';
            card.dataset.category = option.category;
            card.dataset.index = index;
            card.innerHTML = `
                <span class="category-tag">${option.categoryName}</span>
                <div class="option-text">${this.escapeHtml(option.text)}</div>
            `;

            card.addEventListener('click', () => this.selectOption(card, option));
            this.optionsContainer.appendChild(card);
        });
    }

    selectOption(card, option) {
        if (card.classList.contains('disabled')) return;

        const category = option.category;

        // If this category already has a selection, deselect it
        if (this.selectedOptions.has(category)) {
            const prevCard = this.selectedOptions.get(category).element;
            prevCard.classList.remove('selected');
        }

        // If clicking the same card, just deselect
        if (this.selectedOptions.has(category) &&
            this.selectedOptions.get(category).element === card) {
            this.selectedOptions.delete(category);
            this.updateTracker(category, false);
        } else {
            // Select this card
            card.classList.add('selected');
            this.selectedOptions.set(category, { element: card, option: option });
            this.updateTracker(category, true);
        }

        // Check if we have 5 selections
        this.submitBtn.disabled = this.selectedOptions.size < 5;
    }

    updateTracker(category, selected) {
        const tracker = document.querySelector(`.tracker-item[data-category="${category}"]`);
        if (tracker) {
            tracker.classList.toggle('selected', selected);
        }
    }

    submitAnswer() {
        let correctCount = 0;
        const missed = [];

        // Check each selection
        this.selectedOptions.forEach((selection, category) => {
            const card = selection.element;
            const option = selection.option;

            if (option.isCorrect) {
                card.classList.add('correct');
                correctCount++;
            } else {
                card.classList.add('incorrect');

                // Find the correct answer for this category
                const correctOption = this.currentOptions.find(o =>
                    o.category === category && o.isCorrect
                );
                if (correctOption) {
                    missed.push({
                        category: correctOption.categoryName,
                        correct: correctOption.text
                    });
                }
            }
        });

        // Show correct answers that weren't selected
        this.currentOptions.forEach((option, index) => {
            if (option.isCorrect && !this.selectedOptions.has(option.category)) {
                const card = this.optionsContainer.children[index];
                card.classList.add('missed');
                missed.push({
                    category: option.categoryName,
                    correct: option.text
                });
            }
        });

        // Disable all cards
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.add('disabled');
        });

        // Update score
        this.totalCorrect += correctCount;
        this.totalAttempts += 5;
        this.score += correctCount * 10;

        if (correctCount === 5) {
            this.perfectMatches++;
        }

        // Store missed items for review
        if (missed.length > 0) {
            this.missedItems.push({
                drug: this.currentDrug.name,
                missed: missed
            });
        }

        this.updateScore();
        this.showFeedback(correctCount, missed);

        this.submitBtn.disabled = true;
        this.skipBtn.classList.add('hidden');
    }

    showFeedback(correctCount, missed) {
        this.feedback.classList.remove('hidden', 'success', 'partial');

        if (correctCount === 5) {
            this.feedback.classList.add('success');
            this.feedbackContent.innerHTML = `
                <h3>🎉 Perfect!</h3>
                <p>You got all 5 attributes correct!</p>
            `;
        } else {
            this.feedback.classList.add('partial');
            this.feedbackContent.innerHTML = `
                <h3>${correctCount}/5 Correct</h3>
                <p>${missed.length > 0 ? 'Review the highlighted items above.' : ''}</p>
            `;
        }

        // Change button text on last drug
        if (this.currentDrugIndex === this.drugs.length - 1) {
            this.nextDrugBtn.textContent = 'See Results →';
        } else {
            this.nextDrugBtn.textContent = 'Next Drug →';
        }
    }

    skipDrug() {
        // Store all correct answers as missed
        const missed = [];
        this.categories.forEach(cat => {
            if (this.currentDrug[cat.key]) {
                missed.push({
                    category: cat.name,
                    correct: this.currentDrug[cat.key]
                });
            }
        });

        if (missed.length > 0) {
            this.missedItems.push({
                drug: this.currentDrug.name,
                missed: missed
            });
        }

        this.totalAttempts += 5;
        this.nextDrug();
    }

    nextDrug() {
        this.currentDrugIndex++;
        this.skipBtn.classList.remove('hidden');

        if (this.currentDrugIndex >= this.drugs.length) {
            this.showResults();
        } else {
            this.loadDrug();
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    showResults() {
        this.gamePanel.classList.add('hidden');
        this.resultsPanel.classList.remove('hidden');

        this.finalScore.textContent = this.score;
        this.correctDrugs.textContent = this.perfectMatches;

        const accuracyPercent = this.totalAttempts > 0
            ? Math.round((this.totalCorrect / this.totalAttempts) * 100)
            : 0;
        this.accuracy.textContent = accuracyPercent + '%';

        // Show missed items
        if (this.missedItems.length > 0) {
            document.getElementById('review-section').classList.remove('hidden');
            this.missedItemsContainer.innerHTML = this.missedItems.map(item => `
                <div class="missed-item">
                    <h4>${this.escapeHtml(item.drug)}</h4>
                    ${item.missed.map(m => `
                        <div class="correct-answer">
                            <strong>${m.category}:</strong> ${this.escapeHtml(m.correct)}
                        </div>
                    `).join('')}
                </div>
            `).join('');
        } else {
            document.getElementById('review-section').classList.add('hidden');
        }
    }

    showSetup() {
        this.gamePanel.classList.add('hidden');
        this.resultsPanel.classList.add('hidden');
        this.setupPanel.classList.remove('hidden');
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new PharmMatch();
});
