/*
 * Copyright 2017 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the BSD-3 License as modified (the “License”); you may obtain a copy
 * of the license at https://github.com/palantir/blueprint/blob/master/LICENSE
 * and https://github.com/palantir/blueprint/blob/master/PATENTS
 */

import * as classNames from "classnames";
import * as React from "react";

import { Button, Classes, MenuItem, Switch } from "@blueprintjs/core";
import { BaseExample } from "@blueprintjs/docs";
import { ISelectItemRendererProps, Suggest } from "../src";
import { Film, TOP_100_FILMS } from "./data";

const FilmSuggest = Suggest.ofType<Film>();

export interface ISuggestExampleState {
    film?: Film;
    filterable?: boolean;
    minimal?: boolean;
    resetOnClose?: boolean;
    resetOnSelect?: boolean;
}

export class SuggestExample extends BaseExample<ISuggestExampleState> {

    public state: ISuggestExampleState = {
        film: TOP_100_FILMS[0],
        filterable: true,
        minimal: true,
        resetOnClose: false,
        resetOnSelect: false,
    };

    private handleMinimalChange = this.handleSwitchChange("minimal");
    private handleResetOnCloseChange = this.handleSwitchChange("resetOnClose");
    private handleResetOnSelectChange = this.handleSwitchChange("resetOnSelect");

    protected renderExample() {
        const { film, minimal, ...flags } = this.state;
        return (
            <FilmSuggest
                {...flags}
                inputValueRenderer={this.renderInputValue}
                items={TOP_100_FILMS}
                itemPredicate={this.filterFilm}
                itemRenderer={this.renderFilm}
                noResults={<MenuItem disabled text="No results." />}
                onItemSelect={this.handleValueChange}
                popoverProps={{ popoverClassName: minimal ? Classes.MINIMAL : "" }}
            />
        );
    }

    protected renderOptions() {
        return [
            [
                <Switch
                    key="resetOnClose"
                    label="Reset on close"
                    checked={this.state.resetOnClose}
                    onChange={this.handleResetOnCloseChange}
                />,
                <Switch
                    key="resetOnSelect"
                    label="Reset on select"
                    checked={this.state.resetOnSelect}
                    onChange={this.handleResetOnSelectChange}
                />,
                <Switch
                    key="minimal"
                    label="Minimal popover style"
                    checked={this.state.minimal}
                    onChange={this.handleMinimalChange}
                />,
            ],
        ];
    }

    private renderFilm({ handleClick, isActive, item: film }: ISelectItemRendererProps<Film>) {
        const classes = classNames({
            [Classes.ACTIVE]: isActive,
            [Classes.INTENT_PRIMARY]: isActive,
        });
        return (
            <MenuItem
                className={classes}
                label={film.year.toString()}
                key={film.rank}
                onClick={handleClick}
                text={`${film.rank}. ${film.title}`}
            />
        );
    }

    private renderInputValue = (film: Film) => {
        return film.title;
    }

    private filterFilm(query: string, film: Film, index: number) {
        return `${index + 1}. ${film.title.toLowerCase()} ${film.year}`.indexOf(query.toLowerCase()) >= 0;
    }

    private handleValueChange = (film: Film) => this.setState({ film });

    private handleSwitchChange(prop: keyof ISuggestExampleState) {
        return (event: React.FormEvent<HTMLInputElement>) => {
            this.setState({ [prop]: event.currentTarget.checked });
        };
    }
}
