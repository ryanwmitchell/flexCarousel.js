import transform from './transform';
import leftPage from './leftPage';

export default function (instance, target) {
    const slides = instance._selector.querySelector('.fc-slides');

    if (instance._options.transition === 'slide') {
        slides.style.transition = `all ${instance._options.transitionSpeed}ms ease-in-out 0s`;
    }

    transform(instance, Math.ceil(target));

    new Promise((resolve) => {
        setTimeout(() => {
            if (instance._options.transition === 'slide') {
                slides.style.transition = '';
            }

            resolve(true);
        }, instance._options.transitionSpeed);
    }).then(() => transform(instance, leftPage(instance, instance._currentPage)));
}