/*
 * flexCarousel.js v1.0.0
 * https://github.com/tomhrtly/flexCarousel.js
 *
 * Copyright 2020 Tom Hartley
 * Released under the MIT license
 *
 * Icons provided by Font Awesome: https://fontawesome.com
 */

import defaults from './core/defaults';
import slides from './core/slides';
import arrows from './components/arrows';
import autoplay from './components/autoplay';
import height from './components/height';

class FlexCarousel {
    constructor(selector, options = {}) {
        this._selectorName = selector.toString();
        this._selector = document.querySelector(selector);
        this._defaults = defaults(this);

        this._activeBreakpoint = null;
        this._breakpoints = [];
        this._customEvents = {
            breakpoint: new CustomEvent('breakpoint.fc'),
            pageChanged: new CustomEvent('pageChanged.fc'),
            pageChanging: new CustomEvent('pageChanging.fc'),
        };
        this._options = FlexCarousel.extend(this._defaults, options);
        this._originalOptions = this._options;
        this._pageAmount = null;
        this._pageWidth = null;

        this._currentPage = this._options.initialPage;

        this._init();

        return this._selector;
    }

    _animatePage(target) {
        const slides = this._selector.querySelector('.fc-slides');

        if (this._options.transition === 'slide') {
            slides.style.transition = `all ${this._options.transitionSpeed}ms ease-in-out 0s`;
        }

        this._setTransform(Math.ceil(target));

        new Promise((resolve) => {
            setTimeout(() => {
                if (this._options.transition === 'slide') {
                    slides.style.transition = '';
                }

                resolve(true);
            }, this._options.transitionSpeed);
        }).then(() => this._setTransform(this._getLeftPage(this._currentPage)));
    }

    _buildBreakpointEvent() {
        let timer;

        window.addEventListener('resize', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                this._updateResponsive();
            }, 500);
        });
    }

    _buildBreakpoints() {
        const breakpoints = [];

        if (this._options.responsive) {
            let previous = this._options;

            this._options.responsive.forEach(({ breakpoint, options }) => {
                if (!breakpoints.includes(breakpoint)) {
                    breakpoints.push(breakpoint);

                    this._breakpoints[breakpoint] = FlexCarousel.extend(previous, options);
                    previous = FlexCarousel.extend(previous, options);
                }
            });
        }

        this._buildBreakpointEvent();
        this._updateResponsive(false);
    }

    _buildCircleEvents() {
        const circles = this._selector.querySelector('.fc-container').querySelectorAll('.fc-circle');

        circles.forEach((element, index) => {
            element.addEventListener('click', () => this._movePage(index));
        });
    }

    _buildCircles() {
        if (this._options.circles) {
            // Only show the arrows if there are more slides then slidesPerPage option
            if (this._options.slidesPerPage < this._pageAmount) {
                this._selector.classList.add('fc-has-circles');

                // Create circles container
                const circles = document.createElement('ul');
                circles.classList.add('fc-circles');

                this._selector.querySelector('.fc-container').appendChild(circles);

                const option = this._options.slidesPerPage > this._options.slidesScrolling ? this._options.slidesScrolling : this._options.slidesPerPage;
                const amount = Math.ceil(this._pageAmount / option);

                for (let index = 0; index < amount; index += 1) {
                    const li = document.createElement('li');

                    const circle = document.createElement('button');
                    circle.classList.add('fc-circle');
                    circle.setAttribute('aria-label', `${FlexCarousel.suffix(index + 1)} page`);

                    const icon = document.createElement('span');
                    icon.classList.add('fc-icon', 'fc-is-circle');

                    const text = document.createElement('span');
                    text.classList.add('fc-is-sr-only');
                    text.innerHTML = index + 1;

                    circle.appendChild(icon);
                    circle.appendChild(text);
                    li.appendChild(circle);
                    circles.appendChild(li);
                }

                if (this._options.circlesOverlay) {
                    this._selector.classList.add('fc-has-circles-overlay');
                }

                this._updateCircles();
                this._buildCircleEvents();
            }
        }
    }

    _buildOptions() {
        autoplay(this);
        height();
    }

    _destroy() {
        this._selector.querySelectorAll('.fc-slide.fc-is-clone').forEach((element) => {
            this._selector.querySelector('.fc-slides').removeChild(element);
        });

        this._selector.querySelectorAll('.fc-slide').forEach((element) => {
            element.removeAttribute('class');
            element.removeAttribute('style');
        });

        this._selector.querySelector('.fc-slides').removeAttribute('style');
        this._selector.querySelector('.fc-slides').removeAttribute('class');

        if (this._options.circles) {
            this._selector.querySelector('.fc-container').removeChild(this._selector.querySelector('.fc-circles'));
        }

        this._selector.innerHTML = this._selector.querySelector('.fc-container').innerHTML;

        this._selector.className = this._selectorName.replace('.', '');
        this._selector.removeAttribute('style');
    }

    _getLeftPage(index) {
        let slideOffset;

        if (this._options.slidesPerPage < this._pageAmount) {
            if (this._options.slidesPerPage >= this._options.slidesScrolling) {
                slideOffset = (this._pageWidth * this._options.slidesPerPage) * -1;
            }

            if (!this._options.infinite) {
                slideOffset = 0;
            }
        }

        return ((index * this._pageWidth) * -1) + slideOffset;
    }

    _init() {
        if (!this._selector.classList.contains('fc')) {
            this._selector.classList.add('fc');
            slides(this);
            arrows(this);
            this._buildCircles();
            this._buildOptions();
            this._buildBreakpoints();
        }
    }

    _movePage(index) {
        const unevenOffset = (this._pageAmount % this._options.slidesScrolling !== 0);
        const indexOffset = unevenOffset ? 0 : (this._pageAmount - this._currentPage) % this._options.slidesScrolling;

        if (index === 'previous') {
            const slideOffset = indexOffset === 0 ? this._options.slidesScrolling : this._options.slidesPerPage - indexOffset;

            if (this._options.slidesPerPage < this._pageAmount) {
                this._slideController(this._currentPage - slideOffset);
            }
        } else if (index === 'next') {
            const slideOffset = indexOffset === 0 ? this._options.slidesScrolling : indexOffset;

            if (this._options.slidesPerPage < this._pageAmount) {
                this._slideController(this._currentPage + slideOffset);
            }
        } else {
            const page = index === 0 ? 0 : index * this._options.slidesScrolling;
            this._slideController(page);
        }

        if (this._options.arrows) {
            this._updateArrows();
        }

        if (this._options.circles) {
            this._updateCircles();
        }

        this._selector.dispatchEvent(this._customEvents.pageChanging);

        setTimeout(() => {
            this._selector.dispatchEvent(this._customEvents.pageChanged);
        }, this._options.transitionSpeed);
    }

    _reinit(options = {}) {
        this._destroy();
        this._options = FlexCarousel.extend(this._defaults, options);
        this._init();
        this._selector.dispatchEvent(this._customEvents.breakpoint);
    }

    _setTransform(position) {
        const slides = this._selector.querySelector('.fc-slides');
        slides.style.transform = `translate3d(${Math.ceil(position)}%, 0px, 0px)`;
    }

    _slideController(index) {
        let nextPage;

        if (index < 0) {
            if (this._pageAmount % this._options.slidesScrolling !== 0) {
                nextPage = this._pageAmount - (this._pageAmount % this._options.slidesScrolling);
            } else {
                nextPage = this._pageAmount + index;
            }
        } else if (index >= this._pageAmount) {
            if (this._pageAmount % this._options.slidesScrolling !== 0) {
                nextPage = 0;
            } else {
                nextPage = index - this._pageAmount;
            }
        } else {
            nextPage = index;
        }

        this._currentPage = nextPage;
        this._animatePage(this._getLeftPage(index));
    }

    _updateArrows() {
        const prevButton = this._options.appendArrows.querySelector('.fc-prev');
        const nextButton = this._options.appendArrows.querySelector('.fc-next');

        if (!this._options.infinite) {
            if (this._currentPage === 0) {
                prevButton.setAttribute('disabled', 'disabled');
            } else {
                prevButton.removeAttribute('disabled');
            }

            if (this._currentPage === this._pageAmount - 1) {
                nextButton.setAttribute('disabled', 'disabled');
            } else {
                nextButton.removeAttribute('disabled');
            }
        }
    }

    _updateCircles() {
        const circles = this._selector.querySelector('.fc-container').querySelectorAll('.fc-circle');

        for (let index = 0; index < circles.length; index += 1) {
            circles[index].classList.remove('fc-is-active');
        }

        const index = Math.floor(this._currentPage / this._options.slidesScrolling);

        circles[index].classList.add('fc-is-active');
    }

    _updateResponsive() {
        let targetBreakpoint;

        this._breakpoints.forEach((options, breakpoint) => {
            if (window.innerWidth >= breakpoint) {
                targetBreakpoint = breakpoint;
            }
        });

        if (targetBreakpoint) {
            if (this._activeBreakpoint) {
                if (targetBreakpoint !== this._activeBreakpoint) {
                    this._activeBreakpoint = targetBreakpoint;
                    this._reinit(this._breakpoints[targetBreakpoint]);
                }
            } else {
                this._activeBreakpoint = targetBreakpoint;
                this._reinit(this._breakpoints[targetBreakpoint]);
            }
        } else if (this._activeBreakpoint !== null) {
            this._activeBreakpoint = null;
            this._reinit(this._originalOptions);
        }
    }

    static extend(obj1, obj2) {
        const extended = {};

        if (obj1) {
            const keys = Object.keys(obj1);

            keys.forEach((value) => {
                if (Object.prototype.hasOwnProperty.call(obj1, value)) {
                    extended[value] = obj1[value];
                }
            });
        }

        if (obj2) {
            const keys = Object.keys(obj2);

            keys.forEach((value) => {
                if (Object.prototype.hasOwnProperty.call(obj2, value)) {
                    extended[value] = obj2[value];
                }
            });
        }

        return extended;
    }

    static suffix(index) {
        const j = index % 10;
        const k = index % 100;

        if (j === 1 && k !== 11) {
            return `${index}st`;
        }

        if (j === 2 && k !== 12) {
            return `${index}nd`;
        }

        if (j === 3 && k !== 13) {
            return `${index}rd`;
        }

        return `${index}th`;
    }
}

export default FlexCarousel;
