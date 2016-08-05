var cheerio = require('cheerio');
var request = require('request');
var iconv = require('iconv-lite');
var Promise = require('promise');

var csv = process.argv.slice(2).toString();

function tracking(id, callback) {
    var url = 'http://www.hanjin.co.kr/Delivery_html/inquiry/result_waybill.jsp?wbl_num='+id;
    request({
        url:url,
        encoding: null,
        headers:{
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/603.1.1 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7'
        }
    }, function(err, res, responseBody) {
        if (err) {
            callback(err, {
                code:400,
                status:'조회에 실패하였습니다'
            });
            return;
        }
        var response_encoding = /charset=([^;]+)/gim.exec(res.headers['content-type'])[1];
        var html = iconv.decode(responseBody, response_encoding);

        var tableKey = [];
        var tableRow = [];
        var currentStatus = "알수없음";
        var $ = cheerio.load(html);
        var $table = $('#result_waybill2 table').last();
        $('#result_waybill2 .new_p ul li img').each(function() {
            var match = /^(.+)\(현재단계\)$/.exec($(this).attr('alt'));
            if (match) {
                currentStatus = match[1];
                return false;
            }
        });
        $table.find('thead tr th img').each(function() {
            tableKey.push($(this).attr('alt'));
        });
        $table.find('tbody tr').each(function() {
            var row = [];
            $(this).find('td').each(function(idx) {
                row.push($(this).text().trim());
            });
            tableRow.push(row);
        });
        callback(null, {
            code:200,
            status:currentStatus,
            data: {
                id:id,
                status:currentStatus,
                list:tableRow
            }
        });
    });
}
function promTracking(id) {
    return new Promise(function(resolved, rejected) {
        tracking(id, function(err, result) {
            if (err) {
                rejected(err);
            } else {
                resolved({
                    request:id,
                    response:result
                });
            }
        });
    });
}


var input_list = csv.split(',');
Promise.all(input_list.map(id => {
    return promTracking(id);
})).then(results => {
    var map = {};
    results.forEach(function(item) {
        map[item.request] = item.response;
    });
    console.log(JSON.stringify(map));
});