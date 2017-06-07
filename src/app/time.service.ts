import { Injectable } from '@angular/core';
import * as moment from 'moment/moment';

@Injectable()
export class TimeService {

  private DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  private DIFF_2000_1970 = moment('2000-01-01').diff('1970-01-01', 'ms') - 3600000 - 86400000

  constructor() { }

  intDiv(a, b) {
    return Math.floor(a / b)
  }

  /**
   * @param u in milliseconds since 1 January 1970
   * @returns `d`
   */
  unixTimeToDayFraction(u) {
    let t = moment(u)
    let y = t.year(), m = t.month()+1, D = t.date()
    let d = 367 * y - this.intDiv(7 * ( y + this.intDiv(m+9,12) ), 4) + this.intDiv(275*m, 9) + D - 730530
    let dayMs = t.milliseconds() + 1000*(t.seconds() + 60*(t.minutes() + 60*(t.hours())))
    let dayFraction = dayMs / this.DAY_MILLISECONDS
    return d + dayFraction
  }

  dayFractionToUnixTime(d) {
    return Math.floor(d * this.DAY_MILLISECONDS + this.DIFF_2000_1970)
  }
}
