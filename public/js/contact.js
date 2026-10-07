const form = document.getElementById('enquiry-form');
const interest = new URLSearchParams(location.search).get('interest');
if (interest && [...form.interest.options].some((o) => o.text === interest)) form.interest.value = interest;
const status = document.getElementById('form-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = '';

  try {
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();

    if (data.ok) {
      form.reset();
      status.textContent = 'Thank you. I will reply within two working days.';
    } else {
      status.textContent = Object.values(data.errors || {}).join(' ') || 'Something went wrong.';
    }
  } catch {
    status.textContent = 'Could not send. Please email info@zairachrista.studio instead.';
  } finally {
    button.disabled = false;
  }
});
