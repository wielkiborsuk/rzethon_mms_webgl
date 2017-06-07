import { Injectable } from '@angular/core';
import * as moment from 'moment/moment';

@Injectable()
export class StateService {

  private DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

  public timeFactor = 1;
  public d = this.unixTimeToDayFraction(new Date().getTime());
  public prevRenderTime = new Date().getTime();
  public planetNodes = [];
  public msgNodes = [];
  public msgs = [];
  public isLeftMouseButtonDown = false;
  public isArrowDownDown = false;

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
}
