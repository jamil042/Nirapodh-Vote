
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            
            // Trigger counter animation for stats
            if (entry.target.classList.contains('stats-section')) {
                animateCounters();
            }
        }
    });
}, observerOptions);

// Observe all animated elements
document.addEventListener('DOMContentLoaded', () => {
    const fadeElements = document.querySelectorAll('.fade-in, .slide-up');
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
});

// Counter Animation

let countersAnimated = false;

function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60 FPS
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            
            if (current < target) {
                // Format number with Bengali numerals
                if (target >= 1000) {
                    counter.textContent = toBengaliNumber(Math.floor(current).toLocaleString('en-US'));
                } else {
                    counter.textContent = toBengaliNumber(current.toFixed(1));
                }
                requestAnimationFrame(updateCounter);
            } else {
                if (target >= 1000) {
                    counter.textContent = toBengaliNumber(target.toLocaleString('en-US'));
                } else {
                    counter.textContent = toBengaliNumber(target);
                }
            }
        };
        
        updateCounter();
    });
}

// Smooth Scrolling

document.querySelectorAll('a.smooth-scroll').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});


// Scroll to Top Button


const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
    
    // Header shadow on scroll
    const header = document.querySelector('.header');
    if (window.pageYOffset > 50) {
        header.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


// Feature Cards Interactive Effect

const featureItems = document.querySelectorAll('.feature-item');

featureItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});


// Step Cards Interactive Animation

const steps = document.querySelectorAll('.step');

steps.forEach((step, index) => {
    step.style.animationDelay = `${index * 0.2}s`;
    
    step.addEventListener('mouseenter', function() {
        const stepNumber = this.querySelector('.step-number');
        stepNumber.style.transform = 'scale(1.15) rotate(5deg)';
    });
    
    step.addEventListener('mouseleave', function() {
        const stepNumber = this.querySelector('.step-number');
        stepNumber.style.transform = 'scale(1) rotate(0deg)';
    });
});


// Parallax Effect on Background Circles

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const circles = document.querySelectorAll('.circle');
    
    circles.forEach((circle, index) => {
        const speed = (index + 1) * 0.2;
        circle.style.transform = `translateY(${scrolled * speed}px)`;
    });
});


// Dynamic Button Ripple Effect

document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple-effect');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple CSS dynamically
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// Info Cards Sequential Animation

const infoCards = document.querySelectorAll('.info-card');

const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
            }, index * 150);
        }
    });
}, observerOptions);

infoCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px) scale(0.95)';
    card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cardObserver.observe(card);
});


// Trust Indicators Animation


const trustItems = document.querySelectorAll('.trust-item');

trustItems.forEach((item, index) => {
    setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
    }, 600 + (index * 150));
    
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    item.style.transition = 'all 0.5s ease';
});



// Real-time Clock (Bengali)


function updateClock() {
    const now = new Date();
    const hours = toBengaliNumber(now.getHours().toString().padStart(2, '0'));
    const minutes = toBengaliNumber(now.getMinutes().toString().padStart(2, '0'));
    const seconds = toBengaliNumber(now.getSeconds().toString().padStart(2, '0'));
    
    
}

setInterval(updateClock, 1000);
updateClock();


// Performance Optimization

// Lazy load images when they come into view
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}


// Accessibility Enhancements

document.addEventListener('keydown', (e) => {
    // ESC key to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal, .overlay').forEach(el => el.remove());
    }
    
    // Tab navigation enhancement
    if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
    }
});

document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
});


// Console Welcome Message

console.log('%c নিরাপদ ভোট সিস্টেম ', 'background: #006A4E; color: white; font-size: 20px; padding: 10px;');
console.log('%c স্বচ্ছ ও নিরাপদ ডিজিটাল ভোটিং সিস্টেম ', 'color: #006A4E; font-size: 14px;');
console.log('%c Version 1.0.0 | © ২০২৫ বাংলাদেশ নির্বাচন কমিশন ', 'color: #666; font-size: 12px;');

// Page Load Complete

window.addEventListener('load', () => {
    console.log('✓ পেজ সম্পূর্ণভাবে লোড হয়েছে');
    document.body.classList.add('page-loaded');
});