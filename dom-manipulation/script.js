// ---------- STORAGE KEYS ----------
const LOCAL_KEY = 'dq_quotes_v1';      // localStorage key
const SESSION_KEY = 'dq_last_quote';   // sessionStorage key for last viewed quote

// ---------- DEFAULT QUOTES ----------
const DEFAULT_QUOTES = [
  { text: "The best way to predict the future is to invent it.", category: "Inspiration", author: "Alan Kay" },
  { text: "Simplicity is the soul of efficiency.", category: "Wisdom", author: "Austin Freeman" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", category: "Teamwork", author: "African Proverb" }
];

// ---------- Load / Save helpers ----------
function loadQuotes() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [...DEFAULT_QUOTES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Stored quotes not an array');
    return parsed.filter(q => q && typeof q.text === 'string');
  } catch (err) {
    console.error('Error loading quotes from localStorage:', err);
    return [...DEFAULT_QUOTES];
  }
}

function saveQuotes(quotes) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error('Error saving quotes to localStorage:', err);
  }
}

// ---------- Application state ----------
let quotes = loadQuotes();

// ---------- DOM elements ----------
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const showAddFormBtn = document.getElementById('showAddForm');
const addFormContainer = document.getElementById('addFormContainer');
const exportBtn = document.getElementById('exportBtn');
const importFileInput = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAll');
const categoryFilter = document.getElementById('categoryFilter');

// ---------- Utility ----------
function formatQuoteForDisplay(q) {
  const author = q.author ? ` — ${q.author}` : '';
  const cat = q.category ? ` [${q.category}]` : '';
  return `"${q.text}"${author}${cat}`;
}

// ---------- showRandomQuote ----------
function showRandomQuote() {
  if (!quotes.length) {
    quoteDisplay.textContent = 'No quotes available. Add some!';
    return;
  }
  const idx = Math.floor(Math.random() * quotes.length);
  const quote = quotes[idx];
  quoteDisplay.innerHTML = `
    <div>${quote.text}</div>
    <div class="meta">${quote.author ? quote.author + ' · ' : ''}${quote.category || ''}</div>
  `;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(quote));
}
window.showRandomQuote = showRandomQuote;

// ---------- createAddQuoteForm ----------
function createAddQuoteForm() {
  addFormContainer.innerHTML = '';

  const wrapper = document.createElement('div');

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.id = 'newQuoteText';
  textInput.placeholder = 'Enter a new quote';
  textInput.style.width = '50%';

  const authorInput = document.createElement('input');
  authorInput.type = 'text';
  authorInput.id = 'newQuoteAuthor';
  authorInput.placeholder = 'Author (optional)';

  const categoryInput = document.createElement('input');
  categoryInput.type = 'text';
  categoryInput.id = 'newQuoteCategory';
  categoryInput.placeholder = 'Category (e.g., Inspiration)';

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Quote';
  addBtn.onclick = () => addQuote({
    text: textInput.value,
    author: authorInput.value,
    category: categoryInput.value
  });

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Form';
  clearBtn.onclick = () => {
    textInput.value = '';
    authorInput.value = '';
    categoryInput.value = '';
  };

  wrapper.appendChild(textInput);
  wrapper.appendChild(authorInput);
  wrapper.appendChild(categoryInput);
  wrapper.appendChild(addBtn);
  wrapper.appendChild(clearBtn);

  addFormContainer.appendChild(wrapper);
}
window.createAddQuoteForm = createAddQuoteForm;

// ---------- addQuote ----------
function addQuote({ text, author = '', category = '' } = {}) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    alert('Please provide quote text.');
    return;
  }

  const newQuote = {
    text: text.trim(),
    author: author ? author.trim() : '',
    category: category ? category.trim() : ''
  };

  const duplicate = quotes.some(q => q.text === newQuote.text);
  if (duplicate) {
    if (!confirm('A quote with the same text already exists. Add anyway?')) return;
  }

  quotes.push(newQuote);
  saveQuotes(quotes);

  quoteDisplay.innerHTML = `
    <div>${newQuote.text}</div>
    <div class="meta">${newQuote.author ? newQuote.author + ' · ' : ''}${newQuote.category || ''}</div>
  `;

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newQuote));

  // Clear form fields if present
  ['newQuoteText', 'newQuoteAuthor', 'newQuoteCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  alert('Quote added and saved to localStorage!');

  // ✅ Refresh categories after adding a new quote
  populateCategories();
}
window.addQuote = addQuote;

// ---------- Export to JSON ----------
function exportToJson() {
  try {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Export error:', err);
    alert('Could not export quotes. Check console for details.');
  }
}
window.exportToJson = exportToJson;

// ---------- Import from JSON file ----------
function importFromJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        alert('Invalid file format: root element must be an array of quotes.');
        return;
      }

      const valid = imported.reduce((acc, item) => {
        if (item && typeof item.text === 'string' && item.text.trim() !== '') {
          acc.push({
            text: item.text.trim(),
            author: (item.author && typeof item.author === 'string') ? item.author.trim() : '',
            category: (item.category && typeof item.category === 'string') ? item.category.trim() : ''
          });
        }
        return acc;
      }, []);

      if (!valid.length) {
        alert('No valid quotes found in imported file.');
        return;
      }

      const existingTexts = new Set(quotes.map(q => q.text));
      const toAdd = valid.filter(q => !existingTexts.has(q.text));
      if (!toAdd.length) {
        if (!confirm('All imported quotes already exist. Append duplicates?')) return;
        quotes.push(...valid);
      } else {
        quotes.push(...toAdd);
      }

      saveQuotes(quotes);
      alert(`Imported ${toAdd.length} new quotes.`);
      populateCategoryFilter(); // ✅ Refresh dropdown after import
    } catch (err) {
      console.error('Import error:', err);
      alert('Error parsing JSON file.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
window.importFromJsonFile = importFromJsonFile;

// ---------- Clear all quotes ----------
function clearAllQuotes() {
  if (!confirm('This will DELETE ALL quotes. Proceed?')) return;
  quotes = [];
  saveQuotes(quotes);
  quoteDisplay.textContent = 'All quotes deleted.';
  populateCategories(); // ✅ Update filter dropdown
}
window.clearAllQuotes = clearAllQuotes;

// ---------- Populate categories ----------
function populateCategories() {
  if (!categoryFilter) return;
  const categories = [...new Set(quotes.map(q => q.category).filter(c => c))];
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  const savedCategory = localStorage.getItem('dq_selectedCategory');
  if (savedCategory && categories.includes(savedCategory)) {
    categoryFilter.value = savedCategory;
    filterQuotes();
  }
}

// ---------- Filter quotes ----------
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem('dq_selectedCategory', selectedCategory);

  const filtered = selectedCategory === 'all'
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (!filtered.length) {
    quoteDisplay.textContent = `No quotes found for "${selectedCategory}".`;
    return;
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  quoteDisplay.innerHTML = `
    <div>${random.text}</div>
    <div class="meta">${random.author ? random.author + ' · ' : ''}${random.category || ''}</div>
  `;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(random));
}
window.filterQuotes = filterQuotes;

// ---------- Init ----------
function init() {
  if (newQuoteBtn) newQuoteBtn.addEventListener('click', showRandomQuote);
  if (showAddFormBtn) showAddFormBtn.addEventListener('click', createAddQuoteForm);
  if (exportBtn) exportBtn.addEventListener('click', exportToJson);
  if (importFileInput) importFileInput.addEventListener('change', importFromJsonFile);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllQuotes);
  if (categoryFilter) categoryFilter.addEventListener('change', filterQuotes);

  // ✅ Populate categories on load
populateCategories();

// Restore last session quote
  try {
    const lastRaw = sessionStorage.getItem(SESSION_KEY);
    if (lastRaw) {
      const last = JSON.parse(lastRaw);
      quoteDisplay.innerHTML = `
        <div>${last.text}</div>
        <div class="meta">${last.author ? last.author + ' · ' : ''}${last.category || ''}</div>
      `;
      return;
    }
  } catch (err) {
    console.warn('Could not read sessionStorage last quote:', err);
  }

  showRandomQuote();
}
init();
