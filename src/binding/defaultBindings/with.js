/*global ko*/
(function () {
    'use strict';
    function makeWithBinding(bindingKey) {
        ko.bindingHandlers[bindingKey] = {
            init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var savedNodes, completeOnRender, needAsyncContext;
                var as = allBindings.get('as');
                var noChildContext = allBindings.get('noChildContext');
                var withOptions = {
                    as: as,
                    noChildContext: noChildContext
                };

                // 'with' is similar to 'if' in that it controls descendent elements if the
                // value is set to 'null' or 'undefined', but different in that 'false' would
                // not be considered 'falsy' in this sense. It has different semantics; rather than
                // a true/false control flow, it is essentially a convenience to disable display of
                // sub-elements if the value is not usable.
                // TODO: i'm not sure this is a good idea; it may be better simply to wrap in an 'if',
                // or have a separate 'with-if'; what if one wants the null value?
                // It is true that with is typically used with objects, to ease access to properties, and
                // it is common to 'null out' an object if it is not populated yet.

                completeOnRender = allBindings.get('completeOn') == 'render';
                needAsyncContext = completeOnRender || allBindings['has'](ko.bindingEvent.descendantsComplete);

                ko.computed(function () {
                    var value =  ko.utils.unwrapObservable(valueAccessor());
                    var shouldDisplay = !(value === null || typeof value === 'undefined');
                    var isFirstRender = !savedNodes;

                    // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                    // TODO: and only if the value is an observable? otherwise, there is never a need to
                    // remove/add the children.
                    if (isFirstRender && ko.computedContext.getDependenciesCount()) {
                        savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                    }

                    if (needAsyncContext) {
                        bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                    }

                    if (shouldDisplay) {
                        if (!isFirstRender) {
                            ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                        }

                        var childContext = bindingContext['createChildContext'](typeof value == 'function' ? value : valueAccessor, withOptions);

                        ko.applyBindingsToDescendants(childContext, element);
                    } else {
                        ko.virtualElements.emptyNode(element);

                        if (!completeOnRender) {
                            ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                        }
                    }
                }, null, {
                    disposeWhenNodeIsRemoved: element
                });

                return {
                    controlsDescendantBindings: true
                };
            }
        };
        ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
        ko.virtualElements.allowedBindings[bindingKey] = true;
    }

    // Construct the actual binding handlers
    makeWithBinding('with');

})();