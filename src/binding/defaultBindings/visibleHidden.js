/*global ko*/
(function () {
    'use strict';
    ko.bindingHandlers.visible = {
        update: function (element, valueAccessor) {
            const value = ko.utils.unwrapObservable(valueAccessor());
            const isCurrentlyVisible = !(element.style.display == 'none');

            if (value && !isCurrentlyVisible) {
                element.style.display = '';
            } else if ((!value) && isCurrentlyVisible) {
                element.style.display = 'none';
            }
        }
    };

    ko.bindingHandlers.hidden = {
        update: function (element, valueAccessor) {
            ko.bindingHandlers.visible.update(element, function () {
                return !ko.utils.unwrapObservable(valueAccessor());
            });
        }
    };
})();
