"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// skinned-sdk should be the first import in most tests
require("../../../skinned-sdk");
var react_1 = require("react");
var test_utils_1 = require("react-dom/test-utils");
var test_utils_2 = require("react-dom/test-utils");
var TagComposer_1 = require("../../../../src/components/views/elements/TagComposer");
describe("<TagComposer />", function () {
    var defaultProps = {
        tags: [],
        onAdd: jest.fn(),
        onRemove: jest.fn()
    };
    var getComponent = function (props) {
        if (props === void 0) { props = {}; }
        return test_utils_1.renderIntoDocument(<TagComposer_1["default"] {...defaultProps} {...props}/>);
    };
    var getForm = function (container) { return test_utils_1.findRenderedDOMComponentWithTag(container, 'form'); };
    var getInput = function (container) {
        var form = getForm(container);
        return form.querySelector('input');
    };
    var getAddButton = function (container) {
        var form = getForm(container);
        return form.querySelector('[role=button]');
    };
    var editNewTag = function (container, value) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, test_utils_2.act(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var input;
                    return __generator(this, function (_a) {
                        input = getInput(container);
                        test_utils_1.Simulate.change(input, { target: { value: value } });
                        return [2 /*return*/];
                    });
                }); })];
        });
    }); };
    var submitForm = function (container) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, test_utils_2.act(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var form;
                    return __generator(this, function (_a) {
                        form = getForm(container);
                        test_utils_1.Simulate.submit(form);
                        return [2 /*return*/];
                    });
                }); })];
        });
    }); };
    // Field component debounces validate on change
    // jest@26 fake timers and lodash debounce are not friends
    // blur input to trigger a validation
    var blurInput = function (container) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, test_utils_2.act(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var input;
                    return __generator(this, function (_a) {
                        input = getInput(container);
                        test_utils_1.Simulate.blur(input);
                        return [2 /*return*/];
                    });
                }); })];
        });
    }); };
    var clickAddNewTag = function (container) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, test_utils_2.act(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        test_utils_1.Simulate.click(getAddButton(container));
                        return [2 /*return*/];
                    });
                }); })];
        });
    }); };
    it('renders tags', function () {
        var tags = ['tag 1', 'tag 2'];
        var container = getComponent({ tags: tags });
        var tagElements = test_utils_1.scryRenderedDOMComponentsWithClass(container, 'mx_TagComposer_tag');
        expect(tagElements).toMatchSnapshot();
    });
    it('removes tags on remove button click', function () {
        var tags = ['tag 1', 'tag 2'];
        var onRemove = jest.fn();
        var container = getComponent({ tags: tags, onRemove: onRemove });
        var tag1 = test_utils_1.scryRenderedDOMComponentsWithClass(container, 'mx_TagComposer_tag')[0];
        test_utils_2.act(function () {
            test_utils_1.Simulate.click(tag1.querySelector('[role=button]'));
        });
        expect(onRemove).toHaveBeenCalledWith('tag 1');
    });
    describe('form', function () {
        it('renders form', function () {
            var container = getComponent();
            var input = getInput(container);
            var addButton = getAddButton(container);
            expect(input).toBeTruthy();
            expect(addButton).toBeTruthy();
        });
        it('adds new tag when there is no validation', function () { return __awaiter(void 0, void 0, void 0, function () {
            var onAdd, container, newKeyword, input;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        onAdd = jest.fn();
                        container = getComponent({ onAdd: onAdd });
                        newKeyword = "new keyword";
                        return [4 /*yield*/, editNewTag(container, newKeyword)];
                    case 1:
                        _a.sent();
                        input = getInput(container);
                        expect(input.value).toEqual(newKeyword);
                        return [4 /*yield*/, blurInput(container)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, clickAddNewTag(container)];
                    case 3:
                        _a.sent();
                        expect(onAdd).toHaveBeenCalledWith(newKeyword);
                        // clears input
                        expect(input.value).toEqual("");
                        return [2 /*return*/];
                }
            });
        }); });
        it('does not add tag with zero length', function () { return __awaiter(void 0, void 0, void 0, function () {
            var onAdd, container;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        onAdd = jest.fn();
                        container = getComponent({ onAdd: onAdd });
                        return [4 /*yield*/, editNewTag(container, "")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, blurInput(container)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, clickAddNewTag(container)];
                    case 3:
                        _a.sent();
                        expect(onAdd).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        describe('with validation', function () {
            it('adds tag on add button click when validation passes', function () { return __awaiter(void 0, void 0, void 0, function () {
                var onAdd, onValidate, container, newKeyword;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            onAdd = jest.fn();
                            onValidate = jest.fn().mockResolvedValue({ valid: true });
                            container = getComponent({ onAdd: onAdd, onValidate: onValidate });
                            newKeyword = "new keyword";
                            return [4 /*yield*/, editNewTag(container, newKeyword)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, blurInput(container)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, clickAddNewTag(container)];
                        case 3:
                            _a.sent();
                            expect(onAdd).toHaveBeenCalledWith(newKeyword);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('disables add button when validation fails', function () { return __awaiter(void 0, void 0, void 0, function () {
                var onAdd, onValidate, container, newKeyword;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            onAdd = jest.fn();
                            onValidate = jest.fn().mockResolvedValue({ valid: false });
                            container = getComponent({ onAdd: onAdd, onValidate: onValidate });
                            newKeyword = "new keyword";
                            return [4 /*yield*/, editNewTag(container, newKeyword)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, blurInput(container)];
                        case 2:
                            _a.sent();
                            expect(getAddButton(container).className.includes('mx_AccessibleButton_disabled')).toBeTruthy();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('disables form submission when validation fails', function () { return __awaiter(void 0, void 0, void 0, function () {
                var onAdd, onValidate, container, newKeyword;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            onAdd = jest.fn();
                            onValidate = jest.fn().mockResolvedValue({ valid: false });
                            container = getComponent({ onAdd: onAdd, onValidate: onValidate });
                            newKeyword = "new keyword";
                            return [4 /*yield*/, editNewTag(container, newKeyword)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, blurInput(container)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, submitForm(container)];
                        case 3:
                            _a.sent();
                            expect(onAdd).not.toHaveBeenCalled();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
});
