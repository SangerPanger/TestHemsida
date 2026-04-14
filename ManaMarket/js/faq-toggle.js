document.addEventListener('DOMContentLoaded', () => {
  const faqContainer = document.querySelector('.faq-container');
  const toggleBtn = document.querySelector('[data-toggle-faq]');

  if (faqContainer && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = faqContainer.getAttribute('data-expanded') === 'true';
      const newState = !isExpanded;

      faqContainer.setAttribute('data-expanded', newState);
      toggleBtn.textContent = newState ? 'Visa färre frågor' : 'Visa alla frågor';

      if (!newState) {
        // Scrolla upp till FAQ-sektionen om man stänger den
        const faqSection = document.getElementById('faq');
        if (faqSection) {
          faqSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }
});
