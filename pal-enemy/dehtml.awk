{
	n ++;
	if (n < 11 || n > 5862)
		next;
	if (n % 38 == 9) {
		print line;
		line = "";
	}
	if ($0 ~ /<td/) {
		sub(/.*<td[^<>]*>/, "");
		sub(/<.td>.*/, "");
		line = line $0 "\t";
	}
}
