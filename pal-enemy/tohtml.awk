# usage: gawk -f tohtml.awk item.tsv enemy.tsv

BEGIN {
	FS = "\t"
	print "<html>";
	print "<head>";
	print "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'/>";
	print "<title>仙剑奇侠传1的敌人属性及插图</title>"
	print "</head>";
	print "<body>";
	print "<p>在网上有很多仙剑1的敌人属性介绍，但是我没有找到有插图的，于是自己做了一个。鼠标放在偷取物品上可以看到物品介绍。</p>";
	print "<p>信息来源:";
	print "<ul><li>插图是用<a href=\"https://code.google.com/p/python-pal/\">python-pal</a>提取的。</li>";
	print "<li>敌人属性来自“外塞之雾”的<a href=\"enemy.htm\">enemy.html</a>。</li>";
	print "<li>物品介绍来自<a href=\"http://hi.baidu.com/eric_chensoft\">Eric-Chen</a>的desc.dat。</li></ul></p>";
	print "<table>";
}

BEGINFILE {
	fileid ++;
}

(fileid == 1) {
	item[$1] = $2;
}

(fileid == 2) {
	n ++;
	if (n == 1) next;
	if (n != 2)
		print "<tr><td>&nbsp;</td></tr>";
	print "<tr>";
	printf("<td id=\"enemy%d\" rowspan=\"5\"><img alt=\"%s\" src=\"imgs/%03d.png\"/></td>\n", n - 1, $1, n - 1);
	printf("<td id=\"%s\">名称: %s</td>\n", $1, $1);
	printf("<td>生命: %s</td>\n", $13);
	printf("<td>经验: %s</td>\n", $14);
	printf("<td>钱: %s</td>\n", $15);
	printf("<td>等级: %s</td>\n", $16);
	print "</tr>";

	print "<tr>";
	printf("<td>武术: %s</td>\n", $23);
	printf("<td>灵力: %s</td>\n", $24);
	printf("<td>防御: %s</td>\n", $25);
	printf("<td>身法: %s</td>\n", $26);
	printf("<td>吉运: %s</td>\n", $27);
	print "</tr>";

	print "<tr>";
	printf("<td>风抗: %s</td>\n", $29);
	printf("<td>雷抗: %s</td>\n", $30);
	printf("<td>水抗: %s</td>\n", $31);
	printf("<td>火抗: %s</td>\n", $32);
	printf("<td>土抗: %s</td>\n", $33);
	print "</tr>";

	print "<tr>";
	printf("<td>毒抗: %s</td>\n", $28);
	printf("<td>物抗: %s</td>\n", $34);
	printf("<td>灵葫值: %s</td>\n", $36);
	printf("<td>出现频率: %s</td>\n", $20);
	if ($21 in item)
		str = sprintf("<span title=\"%s\"><i>%s</i></span>", item[$21], $21);
	else
		str = $21;
	if ($22 == 1)
		printf("<td>偷: %s</td>\n", str);
	else if ($22 > 1)
		printf("<td>偷: %s x %d</td>\n", str, $22);
	print "</tr>";

	print "<tr><td colspan=\"5\">";
	if ($17 != 0)
		printf("(绝招: %s, 频率: %s)", $17, $18);
	if ($35 != 0)
		printf(" (两次行动: %s)", $35);
	#printf("<td>攻击效果(物品): %s</td>\n", $19);
	#if ($19 != 0)
	#	printf(" (攻击效果: %s)", $19);
	print "</td></tr>";

}

END {
	print "</table>";
	print "</body>";
	print "</html>";
}
