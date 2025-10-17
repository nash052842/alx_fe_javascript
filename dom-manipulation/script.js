// script.js

// ---------- STORAGE KEYS ----------
const LOCAL_KEY = 'dq_quotes_v1';      // localStorage key
const SESSION_KEY = 'dq_last_quote';   // sessionStorage key for last viewed quote

// ---------- DEFAULT QUOTES (used only if no saved quotes) ----------
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
    // Basic validation: must be array of objects with at least "text" property
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
  // Save last viewed quote to sessionStorage
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(quote));
}

// Add global reference so onclick binding from HTML would work (if used)
window.showRandomQuote = showRandomQuote;

// ---------- createAddQuoteForm: dynamically injects the form ----------
function createAddQuoteForm() {
  addFormContainer.innerHTML = ''; // clear previous form if present

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

  // small helper: show an example JSON & clear button
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

// ---------- addQuote: validates and adds to array + storage ----------
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

  // Prevent exact duplicates (text-only)
  const duplicate = quotes.some(q => q.text === newQuote.text);
  if (duplicate) {
    if (!confirm('A quote with the same text already exists. Add anyway?')) return;
  }

  quotes.push(newQuote);
  saveQuotes(quotes);

  // Optionally show the newly added quote immediately
  quoteDisplay.innerHTML = `
    <div>${newQuote.text}</div>
    <div class="meta">${newQuote.author ? newQuote.author + ' · ' : ''}${newQuote.category || ''}</div>
  `;

  // Update sessionStorage last viewed
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newQuote));

  // Clear the form fields if present
  const t = document.getElementById('newQuoteText');
  const a = document.getElementById('newQuoteAuthor');
  const c = document.getElementById('newQuoteCategory');
  if (t) t.value = '';
  if (a) a.value = '';
  if (c) c.value = '';

  alert('Quote added and saved to localStorage!');
}

// expose globally in case HTML user uses inline onclicks
window.addQuote = addQuote;
window.createAddQuoteForm = createAddQuoteForm;

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

    // free memory
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
      // Basic validation + normalization
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

      // Merge while avoiding exact text duplicates
      const existingTexts = new Set(quotes.map(q => q.text));
      const toAdd = valid.filter(q => !existingTexts.has(q.text));
      if (!toAdd.length) {
        if (!confirm('All imported quotes already exist. Do you want to append duplicates anyway?')) {
          return;
        }
        // user chose to append duplicates -> add all valid items
        quotes.push(...valid);
      } else {
        quotes.push(...toAdd);
      }

      saveQuotes(quotes);
      alert(`Imported ${toAdd.length} new quotes (ignored duplicates).`);
    } catch (err) {
      console.error('Import error:', err);
      alert('Error parsing JSON file. Make sure it is valid JSON.');
    } finally {
      // clear the file input so the same file can be re-selected if needed
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
window.importFromJsonFile = importFromJsonFile;

// ---------- Clear all quotes ----------
function clearAllQuotes() {
  if (!confirm('This will DELETE ALL quotes from localStorage. This action cannot be undone. Proceed?')) {
    return;
  }
  quotes = [];
  saveQuotes(quotes);
  quoteDisplay.textContent = 'All quotes deleted.';
}
window.clearAllQuotes = clearAllQuotes;

// ---------- On load: attach listeners and restore last session quote ----------
function init() {
  // Attach button listeners
  if (newQuoteBtn) newQuoteBtn.addEventListener('click', showRandomQuote);
  if (showAddFormBtn) showAddFormBtn.addEventListener('click', createAddQuoteForm);
  if (exportBtn) exportBtn.addEventListener('click', exportToJson);
  if (importFileInput) importFileInput.addEventListener('change', importFromJsonFile);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllQuotes);

  // If there was a last viewed quote this session, show it
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

  // Otherwise show a random one on load
  showRandomQuote();
}

// Kick things off
init();
function populateCategoryFilter() {
  if (!categoryFilter) return;

  // Get all unique categories (ignore empty)
  const categories = [...new Set(quotes.map(q => q.category).filter(c => c))];

  // Clear previous options except "All"
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';

  // Add each category
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore previously selected category from localStorage
  const savedCategory = localStorage.getItem('dq_selectedCategory');
  if (savedCategory && categories.includes(savedCategory)) {
    categoryFilter.value = savedCategory;
    filterQuotes(); // apply immediately
  }
}
