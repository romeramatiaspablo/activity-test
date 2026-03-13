#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG = {
    startDate: "2021-05-01",
    endDate: "2026-12-31",
    minDaysPerWeek: 3,
    maxDaysPerWeek: 5,
    minQuantityPerDay: 1,
    maxQuantityPerDay: 18,
    vacationPeriods: [
        {startDate: "2025-08-11", endDate: "2025-08-15"},
        {startDate: "2024-05-27", endDate: "2024-06-21"},
        {startDate: "2023-01-07", endDate: "2023-01-15"},
        {startDate: "2023-09-11", endDate: "2023-09-24"},
        {startDate: "2022-08-01", endDate: "2022-08-14"},
        {startDate: "2022-01-24", endDate: "2022-01-30"},
        {startDate: "2021-06-27", endDate: "2021-07-18"},
        {startDate: "2021-11-07", endDate: "2021-11-14"},

    ],
    excludedMonthDays: [
        "01-01",
        "03-24",
        "04-02",
        "05-01",
        "05-25",
        "06-20",
        "07-09",
        "12-08",
        "12-25",
    ],
    excludedDates: [
        // 2020
        "2020-02-24",
        "2020-02-25",
        "2020-04-10",
        "2020-06-15",
        "2020-08-17",
        "2020-10-12",
        "2020-11-23",

        // 2021
        "2021-02-15",
        "2021-02-16",
        "2021-05-24",
        "2021-06-21",
        "2021-08-16",
        "2021-10-08",
        "2021-10-11",
        "2021-11-20",
        "2021-11-22",

        // 2022
        "2022-02-28",
        "2022-03-01",
        "2022-04-15",
        "2022-06-17",
        "2022-08-15",
        "2022-09-02",
        "2022-10-07",
        "2022-10-10",
        "2022-11-20",
        "2022-11-21",
        "2022-12-09",
        "2022-12-20",

        // 2023
        "2023-02-20",
        "2023-02-21",
        "2023-04-07",
        "2023-05-26",
        "2023-06-17",
        "2023-06-19",
        "2023-08-21",
        "2023-10-13",
        "2023-10-16",
        "2023-11-20",

        // 2024
        "2024-02-12",
        "2024-02-13",
        "2024-03-29",
        "2024-04-01",
        "2024-06-17",
        "2024-06-21",
        "2024-08-17",
        "2024-10-11",
        "2024-10-12",
        "2024-11-18",

        // 2025
        "2025-03-03",
        "2025-03-04",
        "2025-04-18",
        "2025-06-16",
        "2025-08-17",
        "2025-10-12",
        "2025-11-24",

        // 2026
        "2026-02-16",
        "2026-02-17",
        "2026-04-03",
        "2026-06-15",
        "2026-08-17",
        "2026-10-12",
        "2026-11-23",
    ],
    weekendContributions: {
        enabled: true,
        chancePerEligibleWeek: 0.15,
        maxDaysPerMonth: 2,
        maxDaysPerWeek: 2,
        minQuantityPerDay: 1,
        maxQuantityPerDay: 4,
    },
    outputFilePath: path.resolve(__dirname, "../data/random-days.json"),
};

function fail(message) {
    throw new Error(message);
}

function parseIsoDate(value, fieldName) {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!isoDatePattern.test(value)) {
        fail(`${fieldName} must use YYYY-MM-DD format.`);
    }

    const parsedDate = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(parsedDate.getTime()) || formatDate(parsedDate) !== value) {
        fail(`${fieldName} is not a valid date.`);
    }

    return parsedDate;
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function formatMonthDay(date) {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${month}-${day}`;
}

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
}

function isWeekend(date) {
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

function getWeekStart(date) {
    const dayOfWeek = date.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return addDays(date, diffToMonday);
}

function datesAreEqual(leftDate, rightDate) {
    return formatDate(leftDate) === formatDate(rightDate);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validateInteger(value, fieldName) {
    if (!Number.isInteger(value)) {
        fail(`${fieldName} must be an integer.`);
    }
}

function validateNumber(value, fieldName) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        fail(`${fieldName} must be a valid number.`);
    }
}

function shuffle(items) {
    const shuffledItems = [...items];

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
        const randomIndex = getRandomInt(0, index);
        const currentValue = shuffledItems[index];

        shuffledItems[index] = shuffledItems[randomIndex];
        shuffledItems[randomIndex] = currentValue;
    }

    return shuffledItems;
}

function validateVacationPeriods(vacationPeriods) {
    if (!Array.isArray(vacationPeriods)) {
        fail("vacationPeriods must be an array.");
    }

    return vacationPeriods.map((period, index) => {
        if (!period || typeof period !== "object" || Array.isArray(period)) {
            fail(`vacationPeriods[${index}] must be an object.`);
        }

        const startDate = parseIsoDate(
            period.startDate,
            `vacationPeriods[${index}].startDate`
        );
        const endDate = parseIsoDate(
            period.endDate,
            `vacationPeriods[${index}].endDate`
        );

        if (startDate > endDate) {
            fail(`vacationPeriods[${index}] startDate must be less than or equal to endDate.`);
        }

        return {
            startDate,
            endDate,
        };
    });
}

function validateExcludedMonthDays(excludedMonthDays) {
    if (!Array.isArray(excludedMonthDays)) {
        fail("excludedMonthDays must be an array.");
    }

    const monthDayPattern = /^\d{2}-\d{2}$/;

    return new Set(
        excludedMonthDays.map((monthDay, index) => {
            if (typeof monthDay !== "string" || !monthDayPattern.test(monthDay)) {
                fail(`excludedMonthDays[${index}] must use MM-DD format.`);
            }

            const parsedDate = new Date(`2000-${monthDay}T00:00:00Z`);

            if (Number.isNaN(parsedDate.getTime()) || formatMonthDay(parsedDate) !== monthDay) {
                fail(`excludedMonthDays[${index}] is not a valid month/day.`);
            }

            return monthDay;
        })
    );
}

function validateExcludedDates(excludedDates) {
    if (!Array.isArray(excludedDates)) {
        fail("excludedDates must be an array.");
    }

    return new Set(
        excludedDates.map((date, index) =>
            formatDate(parseIsoDate(date, `excludedDates[${index}]`))
        )
    );
}

function validateWeekendContributions(weekendContributions) {
    if (!weekendContributions || typeof weekendContributions !== "object" || Array.isArray(weekendContributions)) {
        fail("weekendContributions must be an object.");
    }

    if (typeof weekendContributions.enabled !== "boolean") {
        fail("weekendContributions.enabled must be a boolean.");
    }

    validateNumber(
        weekendContributions.chancePerEligibleWeek,
        "weekendContributions.chancePerEligibleWeek"
    );
    validateInteger(
        weekendContributions.maxDaysPerMonth,
        "weekendContributions.maxDaysPerMonth"
    );
    validateInteger(
        weekendContributions.maxDaysPerWeek,
        "weekendContributions.maxDaysPerWeek"
    );
    validateInteger(
        weekendContributions.minQuantityPerDay,
        "weekendContributions.minQuantityPerDay"
    );
    validateInteger(
        weekendContributions.maxQuantityPerDay,
        "weekendContributions.maxQuantityPerDay"
    );

    if (
        weekendContributions.chancePerEligibleWeek < 0 ||
        weekendContributions.chancePerEligibleWeek > 1
    ) {
        fail("weekendContributions.chancePerEligibleWeek must be between 0 and 1.");
    }

    if (weekendContributions.maxDaysPerMonth < 0) {
        fail("weekendContributions.maxDaysPerMonth must be greater than or equal to 0.");
    }

    if (
        weekendContributions.maxDaysPerWeek < 1 ||
        weekendContributions.maxDaysPerWeek > 2
    ) {
        fail("weekendContributions.maxDaysPerWeek must be between 1 and 2.");
    }

    if (weekendContributions.minQuantityPerDay < 1) {
        fail("weekendContributions.minQuantityPerDay must be greater than or equal to 1.");
    }

    if (
        weekendContributions.minQuantityPerDay >
        weekendContributions.maxQuantityPerDay
    ) {
        fail(
            "weekendContributions.minQuantityPerDay must be less than or equal to weekendContributions.maxQuantityPerDay."
        );
    }

    return {
        enabled: weekendContributions.enabled,
        chancePerEligibleWeek: weekendContributions.chancePerEligibleWeek,
        maxDaysPerMonth: weekendContributions.maxDaysPerMonth,
        maxDaysPerWeek: weekendContributions.maxDaysPerWeek,
        minQuantityPerDay: weekendContributions.minQuantityPerDay,
        maxQuantityPerDay: weekendContributions.maxQuantityPerDay,
    };
}

function validateConfig(config) {
    const startDate = parseIsoDate(config.startDate, "startDate");
    const endDate = parseIsoDate(config.endDate, "endDate");
    const minQuantityPerDay = config.minQuantityPerDay ?? config.minQuantity;
    const maxQuantityPerDay = config.maxQuantityPerDay ?? config.maxQuantity;
    const vacationPeriods = validateVacationPeriods(config.vacationPeriods ?? []);
    const excludedMonthDays = validateExcludedMonthDays(config.excludedMonthDays ?? []);
    const excludedDates = validateExcludedDates(config.excludedDates ?? []);
    const weekendContributions = validateWeekendContributions(config.weekendContributions);

    if (startDate > endDate) {
        fail("startDate must be less than or equal to endDate.");
    }

    validateInteger(config.minDaysPerWeek, "minDaysPerWeek");
    validateInteger(config.maxDaysPerWeek, "maxDaysPerWeek");
    validateInteger(minQuantityPerDay, "minQuantityPerDay");
    validateInteger(maxQuantityPerDay, "maxQuantityPerDay");

    if (config.minDaysPerWeek < 1 || config.minDaysPerWeek > 5) {
        fail("minDaysPerWeek must be between 1 and 5.");
    }

    if (config.maxDaysPerWeek < 1 || config.maxDaysPerWeek > 5) {
        fail("maxDaysPerWeek must be between 1 and 5.");
    }

    if (config.minDaysPerWeek > config.maxDaysPerWeek) {
        fail("minDaysPerWeek must be less than or equal to maxDaysPerWeek.");
    }

    if (minQuantityPerDay < 1) {
        fail("minQuantityPerDay must be greater than or equal to 1.");
    }

    if (minQuantityPerDay > maxQuantityPerDay) {
        fail("minQuantityPerDay must be less than or equal to maxQuantityPerDay.");
    }

    if (typeof config.outputFilePath !== "string" || config.outputFilePath.trim() === "") {
        fail("outputFilePath must be a non-empty string.");
    }

    return {
        ...config,
        startDate,
        endDate,
        minQuantityPerDay,
        maxQuantityPerDay,
        vacationPeriods,
        excludedMonthDays,
        excludedDates,
        weekendContributions,
    };
}

function isDateInVacationPeriods(date, vacationPeriods) {
    return vacationPeriods.some(
        (period) => date >= period.startDate && date <= period.endDate
    );
}

function isDateBlockedByCalendar(date, config) {
    const isoDate = formatDate(date);
    const monthDay = formatMonthDay(date);

    return (
        isDateInVacationPeriods(date, config.vacationPeriods) ||
        config.excludedMonthDays.has(monthDay) ||
        config.excludedDates.has(isoDate)
    );
}

function isEligibleWeekday(date, config) {
    return !isWeekend(date) && !isDateBlockedByCalendar(date, config);
}

function isEligibleWeekendDate(date, config) {
    return isWeekend(date) && !isDateBlockedByCalendar(date, config);
}

function collectDatesByWeek(startDate, endDate, isEligibleDate) {
    const weeks = [];
    let currentWeek = null;

    for (let currentDate = startDate; currentDate <= endDate; currentDate = addDays(currentDate, 1)) {
        if (!isEligibleDate(currentDate)) {
            continue;
        }

        const weekStart = getWeekStart(currentDate);

        if (!currentWeek || !datesAreEqual(currentWeek.weekStart, weekStart)) {
            currentWeek = {
                weekStart,
                dates: [],
            };
            weeks.push(currentWeek);
        }

        currentWeek.dates.push(currentDate);
    }

    return weeks;
}

function pickDatesForWeek(weekDates, minDaysPerWeek, maxDaysPerWeek) {
    if (weekDates.length === 0) {
        return [];
    }

    const minDaysToSelect = Math.min(minDaysPerWeek, weekDates.length);
    const maxDaysToSelect = Math.min(maxDaysPerWeek, weekDates.length);
    const selectedDaysCount = getRandomInt(minDaysToSelect, maxDaysToSelect);
    const selectedDates = shuffle(weekDates)
        .slice(0, selectedDaysCount)
        .sort((leftDate, rightDate) => leftDate - rightDate);

    return selectedDates;
}

function getMonthKey(date) {
    return formatDate(date).slice(0, 7);
}

function buildWeekdayEntries(config) {
    const weeks = collectDatesByWeek(
        config.startDate,
        config.endDate,
        (date) => isEligibleWeekday(date, config)
    );

    return weeks.flatMap((week) =>
        pickDatesForWeek(
            week.dates,
            config.minDaysPerWeek,
            config.maxDaysPerWeek
        ).map((date) => ({
            date: formatDate(date),
            quantity: getRandomInt(config.minQuantityPerDay, config.maxQuantityPerDay),
        }))
    );
}

function getSelectableWeekendDates(weekendDates, weekendPolicy, monthCounts) {
    const selectableDates = [];
    const pendingMonthCounts = new Map();

    for (const date of shuffle(weekendDates)) {
        if (selectableDates.length >= weekendPolicy.maxDaysPerWeek) {
            break;
        }

        const monthKey = getMonthKey(date);
        const usedDaysInMonth = monthCounts.get(monthKey) ?? 0;
        const pendingDaysInMonth = pendingMonthCounts.get(monthKey) ?? 0;

        if (usedDaysInMonth + pendingDaysInMonth >= weekendPolicy.maxDaysPerMonth) {
            continue;
        }

        selectableDates.push(date);
        pendingMonthCounts.set(monthKey, pendingDaysInMonth + 1);
    }

    return selectableDates;
}

function buildWeekendEntries(config) {
    const weekendPolicy = config.weekendContributions;

    if (!weekendPolicy.enabled || weekendPolicy.maxDaysPerMonth === 0) {
        return [];
    }

    const weeks = collectDatesByWeek(
        config.startDate,
        config.endDate,
        (date) => isEligibleWeekendDate(date, config)
    );
    const monthCounts = new Map();

    return weeks.flatMap((week) => {
        if (Math.random() >= weekendPolicy.chancePerEligibleWeek) {
            return [];
        }

        const selectableDates = getSelectableWeekendDates(
            week.dates,
            weekendPolicy,
            monthCounts
        );

        if (selectableDates.length === 0) {
            return [];
        }

        const selectedDates = pickDatesForWeek(
            selectableDates,
            1,
            selectableDates.length
        );

        for (const date of selectedDates) {
            const monthKey = getMonthKey(date);
            monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
        }

        return selectedDates.map((date) => ({
            date: formatDate(date),
            quantity: getRandomInt(
                weekendPolicy.minQuantityPerDay,
                weekendPolicy.maxQuantityPerDay
            ),
        }));
    });
}

function buildEntries(config) {
    return [...buildWeekdayEntries(config), ...buildWeekendEntries(config)]
        .sort((leftEntry, rightEntry) => leftEntry.date.localeCompare(rightEntry.date));
}

function writeJsonFile(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function main() {
    const config = validateConfig(CONFIG);
    const entries = buildEntries(config);

    writeJsonFile(config.outputFilePath, entries);

    process.stdout.write(
        `Generated ${entries.length} records in ${config.outputFilePath}\n`
    );
}

try {
    main();
} catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
}
