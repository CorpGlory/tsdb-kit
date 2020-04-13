import * as _ from 'lodash';


export function processSQLLimitOffset(sql: string, limit: number, offset: number): string {
  let splits = sql.split(';');
  if(splits.length > 1 && splits[1] !== '' ) {
    throw Error('multiple metrics currently not supported');
  }
  sql = splits[0]; // removes ";" from EOL

  let relim = /limit [0-9]+/ig;
  let reoff = /offset [0-9]+/ig;

  let limIdx = ensureParentheses(relim, sql);
  if(limIdx.index !== -1) {
    sql = `${sql.slice(0, limIdx.index)}LIMIT ${limit}${sql.slice(limIdx.index + limIdx.length)}`;
  } else {
    sql += ` LIMIT ${limit}`;
  }

  let offIdx = ensureParentheses(reoff, sql);
  if(offIdx.index !== -1) {
    sql = `${sql.slice(0, offIdx.index)}OFFSET ${offset}${sql.slice(offIdx.index + offIdx.length)}`;
  } else {
    sql += ` OFFSET ${offset}`;
  }

  if(splits.length === 2) {
    sql += ';';
  }
  return sql;
}

function ensureParentheses(regex: RegExp, str: string): { index: number, length: number } {
  let occurence: RegExpExecArray;
  while((occurence = regex.exec(str)) !== null) {
    let leftPart = str.slice(0, occurence.index)
    let rightPart = str.slice(occurence.index + occurence[0].length);

    let leftPairing = (leftPart.match(/\(/g) || []).length === (leftPart.match(/\)/g) || []).length;
    let rightPairing = (rightPart.match(/\(/g) || []).length === (rightPart.match(/\)/g) || []).length;

    if(leftPairing && rightPairing) {
      return { index: occurence.index, length: occurence[0].length };
    }
  }
  return { index: -1, length: 0 };
}
