
    var list = [6,5,5,10,24,2,4];
      function quickSort(list,left,right){
          if(left < right){
            pivotIndex = partition(list,left,right);
            quickSort(list,left,pivotIndex - 1);
            quickSort(list,pivotIndex + 1 ,right);
          }
          return list;
        
      }

      function partition(list ,left,right){
          pivot = list[left];
          while( left < right){
            while(list[right] > pivot && left < right){
              --right;
            }
            list[left] = list[right];
            while(list[left] <= pivot && left<right){  
            //list[left] <= pivot 这里需要满足等于的条件，因为如果存在相等的数，
            //left将永远不会大于right，所以要加上等于的情况，
            //left<right这个条件很重要，因为如果满足list[left] <= pivot这个后left会++，
            //此时有可能 left>right，如果不加的话可能会死循环
              ++left;
            } 
            //这里我发现有些文章没有做判断，因为有可能左右相等，所以没必要交换
            if(list[right] != list[left]){
              list[right] = list[left];
            }
           
          }
         list[left] = pivot;
          return left;
      }
     
      console.log(quickSort(list,0,list.length - 1))