import React from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.scss';
import 'twin.macro';

export interface CalendarProps {
  value: Date;
  onChange: (date: Date | undefined) => void;
}

export default function Calendar({ value, onChange }: CalendarProps) {
  return (
    <ReactCalendar
    //   tw="p-2 rounded-xl"
      defaultValue={value}
      onClickDay={(date) => {
        onChange(date);
      }}
    />
  );
}
