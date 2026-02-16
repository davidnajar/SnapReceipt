import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CurrencyHelper {
  /**
   * Get currency symbol for a given currency code
   * @param currency Currency code (USD, EUR, MXN, etc.)
   * @returns Currency symbol
   */
  getCurrencySymbol(currency?: string): string {
    const currencyMap: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'MXN': '$',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'ARS': '$',
      'COP': '$',
      'CLP': '$',
      'PEN': 'S/',
      'UYU': '$'
    };

    return currencyMap[currency?.toUpperCase() || 'USD'] || '$';
  }

  /**
   * Format amount with currency symbol
   * @param amount Amount to format
   * @param currency Currency code
   * @returns Formatted amount string
   */
  formatAmount(amount: number, currency?: string): string {
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get currency name for display
   * @param currency Currency code
   * @returns Currency name
   */
  getCurrencyName(currency?: string): string {
    const currencyNames: { [key: string]: string } = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen',
      'MXN': 'Mexican Peso',
      'CAD': 'Canadian Dollar',
      'AUD': 'Australian Dollar',
      'CHF': 'Swiss Franc',
      'CNY': 'Chinese Yuan',
      'INR': 'Indian Rupee',
      'BRL': 'Brazilian Real',
      'ARS': 'Argentine Peso',
      'COP': 'Colombian Peso',
      'CLP': 'Chilean Peso',
      'PEN': 'Peruvian Sol',
      'UYU': 'Uruguayan Peso'
    };

    return currencyNames[currency?.toUpperCase() || 'USD'] || currency || 'USD';
  }
}
