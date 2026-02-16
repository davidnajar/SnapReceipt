import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CategoryHelper {
  
  /**
   * Get category color for chip styling
   * @param category Category name
   * @returns Ionic color name
   */
  getCategoryColor(category?: string): string {
    if (!category) return 'medium';
    
    const colorMap: { [key: string]: string } = {
      'food': 'success',
      'beverages': 'tertiary',
      'groceries': 'success',
      'restaurant': 'warning',
      'shopping': 'secondary',
      'clothing': 'secondary',
      'electronics': 'primary',
      'travel': 'danger',
      'education': 'tertiary',
      'health': 'success',
      'entertainment': 'warning',
      'home': 'medium',
      'transport': 'danger',
      'other': 'medium'
    };

    return colorMap[category.toLowerCase()] || 'medium';
  }

  /**
   * Get category icon for display
   * @param category Category name
   * @returns Ionicon name
   */
  getCategoryIcon(category?: string): string {
    if (!category) return 'pricetag-outline';
    
    const iconMap: { [key: string]: string } = {
      'food': 'fast-food-outline',
      'beverages': 'cafe-outline',
      'groceries': 'cart-outline',
      'restaurant': 'restaurant-outline',
      'shopping': 'bag-outline',
      'clothing': 'shirt-outline',
      'electronics': 'phone-portrait-outline',
      'travel': 'airplane-outline',
      'education': 'school-outline',
      'health': 'medical-outline',
      'entertainment': 'film-outline',
      'home': 'home-outline',
      'transport': 'car-outline',
      'other': 'pricetag-outline'
    };

    return iconMap[category.toLowerCase()] || 'pricetag-outline';
  }
}
