import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/ko";
dayjs.locale("ko");
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);


export const getRemainTimeArr = (endTime: Dayjs) => {
  const startTime = dayjs().utc();
  const diff = endTime.diff(startTime);
  const diffDay = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHour = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const diffMin = Math.floor((diff / (1000 * 60)) % 60);
  const diffSec = Math.floor((diff / 1000) % 60);

  return [diffDay * 24 + diffHour, diffMin, diffSec];
};

export const getRemainTimeStr = (endTimeUTC: string) => {
  const [diffHour, diffMin, diffSec] = getRemainTimeArr(dayjs.utc(endTimeUTC));
  return `${addZero(diffHour)}:${addZero(diffMin)}:${addZero(diffSec)}`;
}


export const addZero = (number: number) => {
  if (isNaN(number) || number < 0) return "--";
  return number >= 10 ? number : "0" + number;
};