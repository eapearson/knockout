/*global ko*/
(function () {
    'use strict';
    function makeWithBinding(bindingKey) {
        ko.bindingHandlers[bindingKey] = {
            init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                // var withValue = ko.computed(function () {
                //     return ko.utils.unwrapObservable(valueAccessor());
                // }, null, {
                //     disposeWhenNodeIsRemoved: element
                // });

                // store children nodes if need to re-render in the future.
                let savedNodes = null;

                // Flag telling us that the children had previously been rendered.
                // Used for the logic handing a 'with' binding flipping between null/undefined
                // and a value.
                let wasDisplayed = false;

                // Supports the logic for first-time actions within the computed handler.
                let isFirstTime = true;

                const isValueObservable = ko.isObservable(valueAccessor());
                const as = allBindings.get('as');
                const noChildContext = allBindings.get('noChildContext');
                const withOptions = {
                    as: as,
                    noChildContext: noChildContext
                };

                // The 'noChildContext' option determines whether a new binding is created
                // for children; the 'as' option will create an alias for the with value
                // and make it available in a new child context.
                // If we are going to create a child context (not requested not to!), and
                // are going to create an alias (requiring a child context!) we need to
                // re-render (re-insert the cloned child nodes and re-bind them).
                // why?
                // not totally sure.
                // perhaps because the actual 'with' property name may itself have changed.
                // Seems like a rare usage.
                const reRenderOnChange = (() => {
                    if (!isValueObservable) {
                        return false;
                    }
                    if (noChildContext && as) {
                        return false;
                    }
                    return true;
                })();

                // 'with' is similar to 'if' in that it controls descendent elements if the
                // value is set to 'null' or 'undefined', but different in that 'false' would
                // not be considered 'falsy' in this sense. It has different semantics; rather than
                // a true/false control flow, it is essentially a convenience to disable display of
                // sub-elements if the value is not usable.
                // TODO: i'm not sure this is a good idea; it may be better simply to wrap in an 'if',
                // or have a separate 'with-if'; what if one wants the null value?
                // It is true that with is typically used with objects, to ease access to properties, and
                // it is common to 'null out' an object if it is not populated yet.

                const completeOnRender = allBindings.get('completeOn') === 'render';
                const needAsyncContext = completeOnRender || allBindings.has(ko.bindingEvent.descendantsComplete);

                ko.computed(function () {
                    const value =  ko.utils.unwrapObservable(valueAccessor());


                    // The rule for 'with' is that if the bound value is null or undefined, there
                    // are no children and no bindings are made. If the value is observable, and the
                    // value changes to non-null and non-undefined, we need to add the nodes and bind
                    // the context.
                    const shouldDisplay = !(value === null || typeof value === 'undefined');

                    // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                    // TODO: and only if the value is an observable? otherwise, there is never a need to
                    // remove/add the children.
                    if (isFirstTime && ko.computedContext.getDependenciesCount()) {
                        savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                    }

                    if (needAsyncContext) {
                        bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                    }

                    if (shouldDisplay) {
                        let applyBindings = false;
                        if (isFirstTime) {
                            // We are only here upon the first call and the value is true, and we
                            // need to apply bindings for the first time to existing nodes, if any.
                            applyBindings = true;
                        } else {
                            // Only re-add the children if we detected that we may need to.
                            // Actually, we should never get here otherwise!
                            if (!wasDisplayed) {
                                // We are here if the value has switched from empty (null, undefined) to
                                // non-empty.
                                ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                                applyBindings = true;
                            } else {
                                if (reRenderOnChange) {
                                    ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                                    applyBindings = true;
                                }
                            }
                        }

                        if (applyBindings) {
                            const childContext = bindingContext.createChildContext(typeof value == 'function' ? value : valueAccessor, withOptions);
                            ko.applyBindingsToDescendants(childContext, element);
                        }

                        wasDisplayed = true;
                    } else {
                        ko.virtualElements.emptyNode(element);

                        if (!completeOnRender) {
                            ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                        }

                        wasDisplayed = false;
                    }
                    isFirstTime = false;
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