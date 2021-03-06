/*global ko*/
(function () {
    'use strict';
    // Makes a binding like with or if

    // eap - it may seem simpler to combine if and with together, but it makes the
    // implementation more complex and error prone.
    // For one, the if/ifnot simply adds/removes child nodes, without the need to alter
    // the binding context. With, however, exists in order to supplement the binding context!
    function makeIfBinding(bindingKey, isNot) {
        ko.bindingHandlers[bindingKey] = {
            'init': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var savedNodes;

                var ifCondition = ko.computed(function () {
                    var unwrapped = ko.utils.unwrapObservable(valueAccessor());
                    // note that this coerces falsy to boolean
                    return isNot ? !unwrapped : !!unwrapped;
                }, null, {
                    disposeWhenNodeIsRemoved: element
                });

                var completeOnRender = allBindings.get('completeOn') == 'render';
                var needAsyncContext = completeOnRender || allBindings['has'](ko.bindingEvent.descendantsComplete);

                ko.computed(function () {
                    var value = ifCondition();
                    // and this too.
                    var isFirstRender = !savedNodes;

                    // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                    if (isFirstRender && ko.computedContext.getDependenciesCount()) {
                        savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                    }

                    if (needAsyncContext) {
                        bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                    }

                    // This condition is what switches the 'if' binding to render or remove sub-elements.
                    if (value) {
                        if (!isFirstRender) {
                            ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                        }

                        var childContext;
                        if (ifCondition.isActive()) {
                        // this next line caused much recursion when children are recursively build components,
                        // and the if condition switches from true to false.
                        // childContext = bindingContext['extend'](function() { ifCondition(); return null; });
                            childContext = bindingContext;
                        } else {
                            childContext = bindingContext;
                        }

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
    makeIfBinding('if');
    makeIfBinding('ifnot', true /* isNot */);

})();