/*
 * Copyright 2017 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the BSD-3 License as modified (the “License”); you may obtain a copy
 * of the license at https://github.com/palantir/blueprint/blob/master/LICENSE
 * and https://github.com/palantir/blueprint/blob/master/PATENTS
 */

import * as classNames from "classnames";
import * as PureRender from "pure-render-decorator";
import * as React from "react";

import {
    HTMLInputProps,
    IInputGroupProps,
    InputGroup,
    IPopoverProps,
    Keys,
    Menu,
    Popover,
    Position,
    Utils,
} from "@blueprintjs/core";
import {
    IListItemsProps,
    IQueryListRendererProps,
    ISelectItemRendererProps,
    QueryList,
} from "../";
import * as Classes from "../../common/classes";

export interface ISuggestProps<T> extends IListItemsProps<T> {
    /**
     * Whether the dropdown list can be filtered.
     * Disabling this option will remove the `InputGroup` and ignore `inputProps`.
     * @default true
     */
    filterable?: boolean;

    /**
     * Custom renderer for an item in the dropdown list. Receives a boolean indicating whether
     * this item is active (selected by keyboard arrows) and an `onClick` event handler that
     * should be attached to the returned element.
     */
    itemRenderer: (itemProps: ISelectItemRendererProps<T>) => JSX.Element;

    /** React child to render when filtering items returns zero results. */
    noResults?: string | JSX.Element;

    /**
     * Props to spread to `InputGroup`. All props are supported except `ref` (use `inputRef` instead).
     * If you want to control the filter input, you can pass `value` and `onChange` here
     * to override `Select`'s own behavior.
     */
    inputProps?: IInputGroupProps & HTMLInputProps;

    /** Custom renderer to transform an item into a string for the input value. */
    inputValueRenderer: (item: T) => string;

    /** Props to spread to `Popover`. Note that `content` cannot be changed. */
    popoverProps?: Partial<IPopoverProps> & object;

    /**
     * Whether the filtering state should be reset to initial when an item is selected
     * (immediately before `onItemSelect` is invoked). The query will become the empty string
     * and the first item will be made active.
     * @default false
     */
    resetOnSelect?: boolean;

    /**
     * Whether the filtering state should be reset to initial when the popover closes.
     * The query will become the empty string and the first item will be made active.
     * @default false
     */
    resetOnClose?: boolean;
}

export interface ISuggestState<T> {
    activeItem?: T;
    isOpen?: boolean;
    isTyping?: boolean;
    query?: string;
    selectedItem?: T;
}

@PureRender
export class Suggest<T> extends React.Component<ISuggestProps<T>, ISuggestState<T>> {
    public static displayName = "Blueprint.Suggest";

    public static ofType<T>() {
        return Suggest as new () => Suggest<T>;
    }

    public state: ISuggestState<T> = {
        isOpen: false,
        isTyping: false,
        query: "",
    };

    private input: HTMLInputElement;
    private TypedQueryList = QueryList.ofType<T>();
    private queryList: QueryList<T>;
    private refHandlers = {
        input: (ref: HTMLInputElement) => {
            if (ref != null) {
                this.input = ref;
                ref.focus();
                ref.setSelectionRange(0, ref.value.length);
            }
        },
        queryList: (ref: QueryList<T>) => this.queryList = ref,
    };

    public render() {
        // omit props specific to this component, spread the rest.
        const {
            filterable,
            itemRenderer,
            inputProps,
            noResults,
            popoverProps,
            ...restProps,
        } = this.props;

        return <this.TypedQueryList
            {...restProps}
            activeItem={this.state.activeItem}
            onActiveItemChange={this.handleActiveItemChange}
            onItemSelect={this.handleItemSelect}
            query={this.state.query}
            ref={this.refHandlers.queryList}
            renderer={this.renderQueryList}
        />;
    }

    public componentDidUpdate(_prevProps: ISuggestProps<T>, prevState: ISuggestState<T>) {
        if (this.state.isOpen && !prevState.isOpen && this.queryList != null) {
            this.queryList.scrollActiveItemIntoView();
        }
    }

    private renderQueryList = (listProps: IQueryListRendererProps<T>) => {
        // not using defaultProps cuz they're hard to type with generics (can't use <T> on static members)
        const { inputValueRenderer, inputProps = {}, popoverProps = {} } = this.props;
        const { isTyping, selectedItem, query } = this.state;
        const { ref, ...htmlInputProps } = inputProps;
        const { handleKeyDown, handleKeyUp } = listProps;
        const inputValue = isTyping ? query : inputValueRenderer(selectedItem);

        return (
            <Popover
                autoFocus={false}
                enforceFocus={false}
                isOpen={this.state.isOpen}
                position={Position.BOTTOM_LEFT}
                {...popoverProps}
                className={classNames(listProps.className, popoverProps.className)}
                onInteraction={this.handlePopoverInteraction}
                popoverClassName={classNames(Classes.SELECT_POPOVER, popoverProps.popoverClassName)}
                popoverWillOpen={this.handlePopoverWillOpen}
                popoverDidOpen={this.handlePopoverDidOpen}
                popoverWillClose={this.handlePopoverWillClose}
            >
                <div
                    onKeyDown={this.state.isOpen ? handleKeyDown : this.handleTargetKeyDown}
                    onKeyUp={this.state.isOpen ? handleKeyUp : undefined}
                >

                    <InputGroup
                        placeholder="Search..."
                        // rightElement={this.maybeRenderInputClearButton()}
                        value={inputValue}
                        {...htmlInputProps}
                        inputRef={this.refHandlers.input}
                        onChange={this.handleQueryChange}
                    />
                </div>
                <div onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
                    <Menu ulRef={listProps.itemsParentRef}>
                        {this.renderItems(listProps)}
                    </Menu>
                </div>
            </Popover>
        );
    }

    private renderItems({ activeItem, filteredItems, handleItemSelect }: IQueryListRendererProps<T>) {
        const { itemRenderer, noResults } = this.props;
        if (filteredItems.length === 0) {
            return noResults;
        }
        return filteredItems.map((item, index) => itemRenderer({
            index,
            item,
            handleClick: (e) => handleItemSelect(item, e),
            isActive: item === activeItem,
        }));
    }

    private handleActiveItemChange = (activeItem: T) => this.setState({ activeItem });

    private handleTargetKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        // open popover when arrow key pressed on target while closed
        if (event.which === Keys.ARROW_UP || event.which === Keys.ARROW_DOWN) {
            this.setState({ isOpen: true });
        }
    }

    private handleItemSelect = (item: T, event: React.SyntheticEvent<HTMLElement>) => {
        this.setState({ isOpen: false, selectedItem: item });

        if (this.props.resetOnSelect) {
            this.resetQuery();
        }

        Utils.safeInvoke(this.props.onItemSelect, item, event);
    }

    private handlePopoverInteraction = (isOpen: boolean) => {
        this.setState({ isOpen });

        const { popoverProps = {} } = this.props;
        Utils.safeInvoke(popoverProps.onInteraction, isOpen);
    }

    private handlePopoverWillOpen = () => {
        const { popoverProps = {}, resetOnClose } = this.props;

        if (resetOnClose) {
            this.resetQuery();
        }

        Utils.safeInvoke(popoverProps.popoverWillOpen);
    }

    private handlePopoverDidOpen = () => {
        // scroll active item into view after popover transition completes and all dimensions are stable.
        if (this.queryList != null) {
            this.queryList.scrollActiveItemIntoView();
        }

        const { popoverProps = {} } = this.props;
        Utils.safeInvoke(popoverProps.popoverDidOpen);
    }

    private handlePopoverWillClose = () => {
        const { popoverProps = {} } = this.props;
        Utils.safeInvoke(popoverProps.popoverWillClose);
    }

    private handleQueryChange = (event: React.FormEvent<HTMLInputElement>) => {
        const { inputProps = {} } = this.props;
        this.setState({ query: event.currentTarget.value, isTyping: true });
        Utils.safeInvoke(inputProps.onChange, event);
    }

    private resetQuery = () => this.setState({ activeItem: this.props.items[0], query: "" });
}
